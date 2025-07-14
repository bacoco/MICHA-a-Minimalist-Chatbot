import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchPageContent } from './services/jina.js';
import { generateResponse } from './services/albert.js';
import { requestLogger } from './middleware/logger.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any chrome extension
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // For production, add your allowed origins here
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main assist endpoint
app.post('/api/assist', async (req, res) => {
  try {
    const { message, url, context } = req.body;
    
    // Validate request
    if (!message || !url) {
      return res.status(400).json({
        error: 'Missing required fields: message and url'
      });
    }
    
    console.log(`Processing request for ${url} - Type: ${context?.siteType || 'general'}`);
    
    // Fetch page content using Jina
    let pageContent;
    try {
      pageContent = await fetchPageContent(url);
    } catch (error) {
      console.error('Jina extraction failed:', error.message);
      pageContent = null;
    }
    
    // Build context-aware prompt
    const prompt = buildPrompt(message, pageContent, context);
    
    // Generate response using Albert
    const aiResponse = await generateResponse(prompt, context);
    
    // Generate smart suggestions based on context
    const suggestions = generateSuggestions(context);
    
    res.json({
      response: aiResponse,
      suggestions,
      context: {
        siteType: context?.siteType || 'general',
        language: context?.language || 'en'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Build context-aware prompt
function buildPrompt(userMessage, pageContent, context) {
  const { siteType = 'general', language = 'en', title = '' } = context || {};
  
  // Language-specific instructions
  const languageInstruction = language !== 'en' 
    ? `Please respond in ${language} language.` 
    : '';
  
  // Site-type specific context
  const siteContexts = {
    developer: 'This is a developer/programming website. Focus on technical aspects and code-related help.',
    educational: 'This is an educational website. Help with learning and understanding concepts.',
    ecommerce: 'This is an e-commerce website. Assist with product information and shopping decisions.',
    article: 'This is an article or blog. Help with understanding and summarizing content.',
    video: 'This is a video platform. Assist with video content and navigation.',
    social: 'This is a social media platform. Help with content discovery and interaction.',
    general: 'Help the user with their query about this webpage.'
  };
  
  const siteContext = siteContexts[siteType] || siteContexts.general;
  
  // Build the complete prompt
  let prompt = `You are a helpful AI assistant integrated into a web browser. ${languageInstruction}

Context: ${siteContext}
Page Title: ${title}

User Message: "${userMessage}"`;

  if (pageContent) {
    // Limit page content to avoid token limits
    const truncatedContent = pageContent.substring(0, 3000);
    prompt += `\n\nPage Content Summary:\n${truncatedContent}${pageContent.length > 3000 ? '...' : ''}`;
  }
  
  prompt += '\n\nProvide a helpful, concise response that is relevant to the page context.';
  
  return prompt;
}

// Generate smart suggestions based on context
function generateSuggestions(context) {
  const { siteType = 'general', language = 'en' } = context || {};
  
  const suggestionSets = {
    developer: [
      'Explain this code',
      'How do I debug this?',
      'What are the best practices here?',
      'Find similar examples'
    ],
    educational: [
      'Summarize this topic',
      'Explain in simple terms',
      'What are the key concepts?',
      'Give me practice questions'
    ],
    ecommerce: [
      'Compare similar products',
      'Is this a good deal?',
      'What are the reviews saying?',
      'Find alternatives'
    ],
    article: [
      'Summarize this article',
      'What are the main points?',
      'Fact-check this claim',
      'Related articles?'
    ],
    video: [
      'Summarize this video',
      'Key timestamps?',
      'Similar videos?',
      'Transcript available?'
    ],
    social: [
      'What is trending?',
      'Summarize comments',
      'Related discussions?',
      'Key insights?'
    ],
    general: [
      'Summarize this page',
      'What is this about?',
      'Key information?',
      'Help me understand'
    ]
  };
  
  const suggestions = suggestionSets[siteType] || suggestionSets.general;
  
  // Translate suggestions if needed (in production, use proper translation)
  if (language === 'fr') {
    const frenchSuggestions = {
      'Summarize this page': 'Résumer cette page',
      'What is this about?': 'De quoi s\'agit-il?',
      'Key information?': 'Informations clés?',
      'Help me understand': 'Aidez-moi à comprendre'
    };
    return suggestions.map(s => frenchSuggestions[s] || s);
  }
  
  return suggestions.slice(0, 3); // Return top 3 suggestions
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Universal Web Assistant Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Albert API: ${process.env.SERVER_URL_ALBERT || 'Not configured'}`);
});