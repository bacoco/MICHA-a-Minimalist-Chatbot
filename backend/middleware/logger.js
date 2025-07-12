/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  
  // Log request body for POST requests in development
  if (process.env.NODE_ENV === 'development' && req.method === 'POST') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log response
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log response data in development for errors
    if (process.env.NODE_ENV === 'development' && res.statusCode >= 400) {
      console.log('Response:', data);
    }
    
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(err, req, res, next) {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] ERROR ${req.method} ${req.path}`);
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(err);
}