// Seenn React Native SDK - Errors
// MIT License - Open Source

export class SeennException extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SeennException';
  }
}

export class NetworkException extends SeennException {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkException';
  }
}

export class AuthException extends SeennException {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthException';
  }
}

export class ConnectionException extends SeennException {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionException';
  }
}

export class ValidationException extends SeennException {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationException';
  }
}
