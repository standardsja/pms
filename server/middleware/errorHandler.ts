/**
 * Standardized error handling middleware
 * Provides consistent error response format across all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  statusCode: number,
  path: string,
  details?: any
): ErrorResponse {
  return {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path,
    details,
  };
}

/**
 * Main error handling middleware
 * Must be added after all routes
 */
export function errorHandler(
  err: ApiError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const apiError = err as ApiError;
  let statusCode = apiError.statusCode || 500;
  let errorName = 'Internal Server Error';
  let message = err.message || 'An unexpected error occurred';
  let details: any = undefined;

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    errorName = 'Database Error';

    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        message = 'A record with this value already exists';
        details = { field: err.meta?.target };
        break;
      case 'P2025':
        // Record not found
        statusCode = 404;
        errorName = 'Not Found';
        message = 'The requested resource was not found';
        break;
      case 'P2003':
        // Foreign key constraint failed
        message = 'Invalid reference to related resource';
        details = { field: err.meta?.field_name };
        break;
      case 'P2014':
        // Required relation violation
        message = 'Cannot perform operation due to related records';
        break;
      default:
        message = 'Database operation failed';
        details = { code: err.code };
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorName = 'Validation Error';
    message = 'Invalid data provided';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorName = 'Unauthorized';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorName = 'Unauthorized';
    message = 'Authentication token has expired';
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorName = 'Upload Error';
    message = err.message;
  }

  const errorResponse = createErrorResponse(
    errorName,
    message,
    statusCode,
    req.path,
    details
  );

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response) {
  const errorResponse = createErrorResponse(
    'Not Found',
    `Route ${req.method} ${req.path} does not exist`,
    404,
    req.path
  );
  res.status(404).json(errorResponse);
}

/**
 * Custom error classes for specific scenarios
 */

export class BadRequestError extends Error implements ApiError {
  statusCode = 400;
  code = 'BAD_REQUEST';
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error implements ApiError {
  statusCode = 422;
  code = 'VALIDATION_ERROR';
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: app.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
