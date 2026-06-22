const IdempotencyEngine = require('../core/engines/idempotency.engine');

async function idempotencyMiddleware(req, reply) {
  const key = req.headers['idempotency-key'];

  // Se não houver key, seguir em frente
  if (!key) {
    return;
  }

  // Verificar se a key existe e está DONE
  const status = await IdempotencyEngine.getStatus(key);

  if (status && status.status === 'DONE') {
    return reply.send(status.response);
  }

  // Se está em processamento, bloquear
  if (status && status.status === 'PROCESSING') {
    return reply.code(409).send({
      success: false,
      error: {
        code: 'REQUEST_IN_PROGRESS',
        message: 'Request is already being processed',
        statusCode: 409
      }
    });
  }

  req.idempotencyKey = key;
}

module.exports = { idempotencyMiddleware };
