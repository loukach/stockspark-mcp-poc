const { logger } = require('./logger');

class StockSparkError extends Error {
  constructor(message, statusCode = 500, errorCode = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'StockSparkError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class AuthenticationError extends StockSparkError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, 'AUTH_FAILED', details);
    this.name = 'AuthenticationError';
  }
}

class NotFoundError extends StockSparkError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends StockSparkError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class NetworkError extends StockSparkError {
  constructor(message = 'Network request failed', details = null) {
    super(message, 503, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class RateLimitError extends StockSparkError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(message, 429, 'RATE_LIMIT', details);
    this.name = 'RateLimitError';
  }
}

function handleApiError(error, context = {}) {
  const { operation = 'API request', resource = 'resource', vehicleId = null } = context;
  
  // Log the original error
  logger.error(`Error in ${operation}:`, {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });

  // Handle fetch/network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    throw new NetworkError(`Unable to connect to StockSpark API during ${operation}`, {
      originalError: error.message,
      operation,
      resource
    });
  }

  // Handle abort errors (request cancelled)
  if (error.name === 'AbortError' || error.message?.includes('aborted')) {
    throw new NetworkError(`Request was cancelled during ${operation}`, {
      originalError: error.message,
      operation,
      resource
    });
  }

  // Handle HTTP response errors
  if (error.response) {
    const status = error.response.status;
    const statusText = error.response.statusText;
    
    switch (status) {
      case 400:
        throw new ValidationError(`Invalid request for ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          resource,
          vehicleId
        });
        
      case 401:
        throw new AuthenticationError(`Authentication failed during ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          hint: 'Check your credentials and token expiry'
        });
        
      case 403:
        throw new AuthenticationError(`Access forbidden for ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          resource,
          hint: 'You may not have permission to access this resource'
        });
        
      case 404:
        const resourceName = vehicleId ? `Vehicle ${vehicleId}` : resource;
        throw new NotFoundError(resourceName, {
          statusCode: status,
          statusText,
          operation,
          vehicleId,
          hint: vehicleId ? 'Check if the vehicle ID exists in your inventory' : 'Check if the endpoint URL is correct'
        });
        
      case 409:
        throw new ValidationError(`Conflict in ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          resource,
          hint: 'The resource may already exist or be in an incompatible state'
        });
        
      case 422:
        throw new ValidationError(`Invalid data provided for ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          resource,
          hint: 'Check the data format and required fields'
        });
        
      case 429:
        throw new RateLimitError(`Too many requests for ${operation}`, {
          statusCode: status,
          statusText,
          operation,
          hint: 'Wait a moment before retrying'
        });
        
      case 500:
      case 502:
      case 503:
      case 504:
        throw new StockSparkError(`StockSpark API server error during ${operation}`, status, 'SERVER_ERROR', {
          statusCode: status,
          statusText,
          operation,
          resource,
          hint: 'This is a server-side issue. Try again in a few minutes.'
        });
        
      default:
        throw new StockSparkError(`Unexpected error during ${operation}`, status, 'HTTP_ERROR', {
          statusCode: status,
          statusText,
          operation,
          resource
        });
    }
  }

  // Handle JSON parsing errors
  if (error.message?.includes('JSON') || error.name === 'SyntaxError') {
    throw new StockSparkError(`Invalid response format from ${operation}`, 502, 'INVALID_RESPONSE', {
      originalError: error.message,
      operation,
      resource,
      hint: 'The API returned malformed data'
    });
  }

  // Handle validation errors from our own code
  if (error instanceof ValidationError || error instanceof AuthenticationError || 
      error instanceof NotFoundError || error instanceof NetworkError) {
    throw error; // Re-throw our custom errors
  }

  // Default fallback for unknown errors
  throw new StockSparkError(`Unexpected error during ${operation}: ${error.message}`, 500, 'UNKNOWN_ERROR', {
    originalError: error.message,
    operation,
    resource,
    stack: error.stack
  });
}

function formatErrorForUser(error) {
  if (error instanceof StockSparkError) {
    let message = error.message;
    
    // Add helpful context
    if (error.details?.hint) {
      message += `\n💡 Tip: ${error.details.hint}`;
    }
    
    if (error.details?.vehicleId) {
      message += `\n🚗 Vehicle ID: ${error.details.vehicleId}`;
    }
    
    // Add error code for debugging
    if (error.errorCode !== 'UNKNOWN_ERROR') {
      message += `\n🔍 Error Code: ${error.errorCode}`;
    }
    
    return message;
  }
  
  // Fallback for non-StockSpark errors
  return `An unexpected error occurred: ${error.message}`;
}

function isRetryableError(error) {
  if (error instanceof NetworkError) return true;
  if (error instanceof RateLimitError) return true;
  if (error instanceof StockSparkError && error.statusCode >= 500) return true;
  return false;
}

async function withRetry(operation, maxRetries = 3, backoffMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      const delay = backoffMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
        error: error.message,
        attempt,
        maxRetries
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

function validateVehicleId(vehicleId) {
  if (!vehicleId || typeof vehicleId !== 'number' || vehicleId <= 0) {
    throw new ValidationError('Invalid vehicle ID provided', {
      vehicleId,
      hint: 'Vehicle ID must be a positive number'
    });
  }
}

function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, {
      field: fieldName,
      hint: `Please provide a valid ${fieldName}`
    });
  }
}

function validatePrice(price) {
  if (typeof price !== 'number' || price < 0) {
    throw new ValidationError('Invalid price provided', {
      price,
      hint: 'Price must be a positive number'
    });
  }
}

function validateImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    throw new ValidationError('Invalid image path provided', {
      imagePath,
      hint: 'Image path must be a non-empty string'
    });
  }
  
  // Check if it's a URL or file path
  if (!imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.includes('/')) {
    throw new ValidationError('Invalid image path format', {
      imagePath,
      hint: 'Image path must be a valid URL or file path'
    });
  }
}

module.exports = {
  StockSparkError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  NetworkError,
  RateLimitError,
  handleApiError,
  formatErrorForUser,
  isRetryableError,
  withRetry,
  validateVehicleId,
  validateRequired,
  validatePrice,
  validateImagePath
};