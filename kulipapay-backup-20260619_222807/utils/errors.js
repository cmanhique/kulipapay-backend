class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends AppError {
  constructor(code, message) {
    super(code || 'VALIDATION_ERROR', message || 'Validation error', 400);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super('CONFLICT', message || 'Resource already exists', 409);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super('UNAUTHORIZED', message || 'Unauthorized', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super('FORBIDDEN', message || 'Forbidden', 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super('NOT_FOUND', `${resource || 'Resource'} not found`, 404);
  }
}

function handleError(error, reply) {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp
      }
    });
  }

  // =========================
  // ERROS DO PRISMA (DETALHADOS)
  // =========================
  
  // P2002 = Unique constraint violation
  if (error.code === 'P2002') {
    const target = error.meta?.target || [];
    const targetField = Array.isArray(target) ? target.join(', ') : target;
    
    console.error('🔴 P2002 DETAILS:', {
      target: targetField,
      message: error.message,
      model: error.meta?.modelName,
      clientVersion: error.clientVersion
    });

    return reply.status(409).send({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `Unique constraint failed on: ${targetField || 'unknown field'}`,
        fields: Array.isArray(target) ? target : [target],
        statusCode: 409,
        timestamp: new Date().toISOString()
      }
    });
  }

  // P2025 = Record not found
  if (error.code === 'P2025') {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found',
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    });
  }

  // P2003 = Foreign key constraint
  if (error.code === 'P2003') {
    console.error('🔴 P2003 DETAILS:', {
      target: error.meta?.target,
      field: error.meta?.field_name,
      message: error.message
    });

    return reply.status(409).send({
      success: false,
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: error.message || 'Foreign key constraint failed',
        statusCode: 409,
        timestamp: new Date().toISOString()
      }
    });
  }

  // P2010 = Raw query error
  if (error.code === 'P2010') {
    console.error('🔴 P2010 DETAILS:', {
      message: error.message,
      meta: error.meta
    });

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erro genérico
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Unexpected system error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  AppError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  handleError
};