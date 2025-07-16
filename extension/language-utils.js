// Language Utilities Module for Universal Web Assistant
// Handles language-related functions and question extraction

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic'
};

// Extract follow-up questions from AI response
export function extractFollowUpQuestions(aiResponse, language = 'fr') {
  const questions = [];
  
  // Look for the questions section in the response - support multiple languages
  const questionPatterns = [
    // English
    /Suggested questions?\s*:\s*([\s\S]*?)$/i,
    /Questions you might want to ask:\s*([\s\S]*?)$/i,
    // French
    /Questions suggérées\s*:\s*([\s\S]*?)$/i,
    /Questions? (?:à poser|possibles?):\s*([\s\S]*?)$/i,
    // Spanish
    /Preguntas sugeridas\s*:\s*([\s\S]*?)$/i,
    // German
    /Vorgeschlagene Fragen\s*:\s*([\s\S]*?)$/i,
    // Italian
    /Domande suggerite\s*:\s*([\s\S]*?)$/i,
    // Portuguese
    /Perguntas sugeridas\s*:\s*([\s\S]*?)$/i,
    // Dutch
    /Voorgestelde vragen\s*:\s*([\s\S]*?)$/i,
    // Polish
    /Sugerowane pytania\s*:\s*([\s\S]*?)$/i,
    // Russian
    /Предлагаемые вопросы\s*:\s*([\s\S]*?)$/i,
    // Chinese
    /建议的问题\s*:\s*([\s\S]*?)$/i,
    // Japanese
    /提案された質問\s*:\s*([\s\S]*?)$/i,
    // Korean
    /제안된 질문\s*:\s*([\s\S]*?)$/i,
    // Arabic
    /الأسئلة المقترحة\s*:\s*([\s\S]*?)$/i
  ];
  
  for (const pattern of questionPatterns) {
    const match = aiResponse.match(pattern);
    if (match) {
      const questionsText = match[1];
      console.log('Found questions text:', questionsText);
      
      // Split by numbers followed by period and match until question mark
      const questionMatches = questionsText.match(/\d+\.\s*[^?]+\?/g);
      if (questionMatches) {
        questionMatches.forEach(q => {
          // Remove the number and period, trim whitespace
          const cleanQuestion = q.replace(/^\d+\.\s*/, '').trim();
          if (cleanQuestion.length > 0) {
            questions.push(cleanQuestion);
          }
        });
      }
      break;
    }
  }
  
  console.log('Extracted questions:', questions);
  // Return up to 4 questions
  return questions.slice(0, 4);
}

// Generate suggestions based on language
export function generateSuggestions(context) {
  const { siteType = 'general', language = 'fr' } = context || {};
  
  // Suggestions for all supported languages
  const allSuggestions = {
    en: {
      developer: ['Explain this code', 'Debug tips?', 'Best practices?', 'Code complexity?'],
      educational: ['Summarize topic', 'Explain simply', 'Key concepts?', 'Examples?'],
      ecommerce: ['Compare products', 'Good deal?', 'Reviews summary?', 'Value analysis?'],
      article: ['Summarize article', 'Main points?', 'Key takeaways?', 'Conclusion?'],
      video: ['Video summary', 'Key moments?', 'Similar videos?', 'Main message?'],
      social: ['Trending topics?', 'Comments summary', 'Related posts?', 'Sentiment?'],
      general: ['Summarize page', 'Key points?', 'What is this?', 'Context?']
    },
    fr: {
      developer: ['Expliquer ce code', 'Conseils debug?', 'Bonnes pratiques?', 'Complexité?'],
      educational: ['Résumer le sujet', 'Expliquer simplement', 'Concepts clés?', 'Exemples?'],
      ecommerce: ['Comparer produits', 'Bonne affaire?', 'Résumé avis?', 'Analyse valeur?'],
      article: ['Résumer article', 'Points principaux?', 'Points clés?', 'Conclusion?'],
      video: ['Résumé vidéo', 'Moments clés?', 'Vidéos similaires?', 'Message principal?'],
      social: ['Sujets tendance?', 'Résumé commentaires', 'Posts liés?', 'Sentiment?'],
      general: ['Résumer page', 'Points clés?', 'C\'est quoi?', 'Contexte?']
    },
    es: {
      developer: ['Explicar código', '¿Tips debug?', '¿Buenas prácticas?', '¿Complejidad?'],
      educational: ['Resumir tema', 'Explicar simple', '¿Conceptos clave?', '¿Ejemplos?'],
      ecommerce: ['Comparar productos', '¿Buena oferta?', '¿Resumen reseñas?', '¿Análisis valor?'],
      article: ['Resumir artículo', '¿Puntos principales?', '¿Ideas clave?', '¿Conclusión?'],
      video: ['Resumen video', '¿Momentos clave?', '¿Videos similares?', '¿Mensaje principal?'],
      social: ['¿Temas tendencia?', 'Resumen comentarios', '¿Posts relacionados?', '¿Sentimiento?'],
      general: ['Resumir página', '¿Puntos clave?', '¿Qué es esto?', '¿Contexto?']
    },
    de: {
      developer: ['Code erklären', 'Debug-Tipps?', 'Best Practices?', 'Komplexität?'],
      educational: ['Thema zusammenfassen', 'Einfach erklären', 'Schlüsselkonzepte?', 'Beispiele?'],
      ecommerce: ['Produkte vergleichen', 'Gutes Angebot?', 'Bewertungen?', 'Wertanalyse?'],
      article: ['Artikel zusammenfassen', 'Hauptpunkte?', 'Kernaussagen?', 'Fazit?'],
      video: ['Video-Zusammenfassung', 'Schlüsselmomente?', 'Ähnliche Videos?', 'Hauptbotschaft?'],
      social: ['Trending-Themen?', 'Kommentare zusammenfassen', 'Verwandte Posts?', 'Stimmung?'],
      general: ['Seite zusammenfassen', 'Wichtige Punkte?', 'Was ist das?', 'Kontext?']
    },
    it: {
      developer: ['Spiega codice', 'Suggerimenti debug?', 'Best practice?', 'Complessità?'],
      educational: ['Riassumi argomento', 'Spiega semplicemente', 'Concetti chiave?', 'Esempi?'],
      ecommerce: ['Confronta prodotti', 'Buon affare?', 'Riassunto recensioni?', 'Analisi valore?'],
      article: ['Riassumi articolo', 'Punti principali?', 'Punti chiave?', 'Conclusione?'],
      video: ['Riassunto video', 'Momenti chiave?', 'Video simili?', 'Messaggio principale?'],
      social: ['Argomenti di tendenza?', 'Riassunto commenti', 'Post correlati?', 'Sentimento?'],
      general: ['Riassumi pagina', 'Punti chiave?', 'Cos\'è questo?', 'Contesto?']
    },
    pt: {
      developer: ['Explicar código', 'Dicas debug?', 'Boas práticas?', 'Complexidade?'],
      educational: ['Resumir tópico', 'Explicar simplesmente', 'Conceitos-chave?', 'Exemplos?'],
      ecommerce: ['Comparar produtos', 'Bom negócio?', 'Resumo avaliações?', 'Análise valor?'],
      article: ['Resumir artigo', 'Pontos principais?', 'Pontos-chave?', 'Conclusão?'],
      video: ['Resumo vídeo', 'Momentos-chave?', 'Vídeos similares?', 'Mensagem principal?'],
      social: ['Tópicos em alta?', 'Resumo comentários', 'Posts relacionados?', 'Sentimento?'],
      general: ['Resumir página', 'Pontos-chave?', 'O que é isto?', 'Contexto?']
    },
    nl: {
      developer: ['Leg code uit', 'Debug tips?', 'Best practices?', 'Complexiteit?'],
      educational: ['Vat onderwerp samen', 'Leg simpel uit', 'Kernconcepten?', 'Voorbeelden?'],
      ecommerce: ['Vergelijk producten', 'Goede deal?', 'Samenvatting reviews?', 'Waarde analyse?'],
      article: ['Vat artikel samen', 'Hoofdpunten?', 'Kernpunten?', 'Conclusie?'],
      video: ['Video samenvatting', 'Belangrijke momenten?', 'Vergelijkbare video\'s?', 'Hoofdboodschap?'],
      social: ['Trending onderwerpen?', 'Samenvatting reacties', 'Gerelateerde posts?', 'Sentiment?'],
      general: ['Vat pagina samen', 'Kernpunten?', 'Wat is dit?', 'Context?']
    }
  };
  
  const langSuggestions = allSuggestions[language] || allSuggestions.fr;
  return langSuggestions[siteType] || langSuggestions.general;
}

// Get question section pattern for all languages
export function getQuestionSectionPattern() {
  return /\n*(?:Suggested questions?|Questions suggérées|Preguntas sugeridas|Vorgeschlagene Fragen|Domande suggerite|Perguntas sugeridas|Voorgestelde vragen|Sugerowane pytania|Предлагаемые вопросы|建议的问题|提案された質問|제안된 질문|الأسئلة المقترحة|Questions you might want to ask|Questions? (?:à poser|possibles?))\s*:\s*[\s\S]*$/i;
}

// Get localized error messages
export function getLocalizedError(error, language = 'fr') {
  const errorMessages = {
    en: {
      'API key not configured': 'API key not configured. Please set it in extension options.',
      'Invalid API key': 'Invalid API key. Please check your configuration.',
      'Rate limit exceeded': 'Rate limit exceeded. Please try again later.',
      'Service temporarily unavailable': 'Service temporarily unavailable. Please try again later.',
      'Network error': 'Network error. Check your internet connection.',
      'Failed to fetch': 'Unable to contact server. Check your connection.'
    },
    fr: {
      'API key not configured': 'Clé API non configurée. Veuillez la configurer dans les options de l\'extension.',
      'Invalid API key': 'Clé API invalide. Veuillez vérifier votre configuration.',
      'Rate limit exceeded': 'Limite de requêtes dépassée. Veuillez réessayer plus tard.',
      'Service temporarily unavailable': 'Service temporairement indisponible. Veuillez réessayer plus tard.',
      'Network error': 'Erreur réseau. Vérifiez votre connexion internet.',
      'Failed to fetch': 'Impossible de contacter le serveur. Vérifiez votre connexion.'
    },
    es: {
      'API key not configured': 'Clave API no configurada. Por favor, configúrela en las opciones de la extensión.',
      'Invalid API key': 'Clave API inválida. Por favor, verifique su configuración.',
      'Rate limit exceeded': 'Límite de solicitudes excedido. Intente de nuevo más tarde.',
      'Service temporarily unavailable': 'Servicio temporalmente no disponible. Intente de nuevo más tarde.',
      'Network error': 'Error de red. Verifique su conexión a internet.',
      'Failed to fetch': 'No se puede contactar el servidor. Verifique su conexión.'
    },
    de: {
      'API key not configured': 'API-Schlüssel nicht konfiguriert. Bitte in den Erweiterungsoptionen festlegen.',
      'Invalid API key': 'Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihre Konfiguration.',
      'Rate limit exceeded': 'Anfragelimit überschritten. Bitte versuchen Sie es später erneut.',
      'Service temporarily unavailable': 'Service vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
      'Network error': 'Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.',
      'Failed to fetch': 'Server konnte nicht kontaktiert werden. Überprüfen Sie Ihre Verbindung.'
    },
    it: {
      'API key not configured': 'Chiave API non configurata. Configurala nelle opzioni dell\'estensione.',
      'Invalid API key': 'Chiave API non valida. Controlla la configurazione.',
      'Rate limit exceeded': 'Limite di richieste superato. Riprova più tardi.',
      'Service temporarily unavailable': 'Servizio temporaneamente non disponibile. Riprova più tardi.',
      'Network error': 'Errore di rete. Controlla la connessione internet.',
      'Failed to fetch': 'Impossibile contattare il server. Controlla la connessione.'
    },
    pt: {
      'API key not configured': 'Chave API não configurada. Configure nas opções da extensão.',
      'Invalid API key': 'Chave API inválida. Verifique sua configuração.',
      'Rate limit exceeded': 'Limite de solicitações excedido. Tente novamente mais tarde.',
      'Service temporarily unavailable': 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
      'Network error': 'Erro de rede. Verifique sua conexão com a internet.',
      'Failed to fetch': 'Não foi possível contactar o servidor. Verifique sua conexão.'
    },
    nl: {
      'API key not configured': 'API-sleutel niet geconfigureerd. Stel deze in bij extensie-opties.',
      'Invalid API key': 'Ongeldige API-sleutel. Controleer uw configuratie.',
      'Rate limit exceeded': 'Aanvraaglimiet overschreden. Probeer het later opnieuw.',
      'Service temporarily unavailable': 'Service tijdelijk niet beschikbaar. Probeer het later opnieuw.',
      'Network error': 'Netwerkfout. Controleer uw internetverbinding.',
      'Failed to fetch': 'Kan server niet bereiken. Controleer uw verbinding.'
    }
  };
  
  const langMessages = errorMessages[language] || errorMessages.en;
  
  for (const [key, value] of Object.entries(langMessages)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  return error;
}