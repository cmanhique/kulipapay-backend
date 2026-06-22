// ============================================
// CONFIRMATION ROUTES
// ============================================

const { prisma } = require('../prisma');

module.exports = async function (fastify, opts) {
  // Confirm transaction
  fastify.post('/confirmation/confirm', async (request, reply) => {
    try {
      const { transactionId, accountId, otp } = request.body;
      
      if (!transactionId || !accountId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'transactionId and accountId are required'
          }
        });
      }

      // TODO: Implementar lógica de confirmação
      // 1. Verificar se a transação existe
      // 2. Verificar se o accountId é o destinatário
      // 3. Verificar OTP se necessário
      // 4. Atualizar status da transação

      return {
        success: true,
        data: {
          transactionId,
          accountId,
          confirmed: true,
          confirmedAt: new Date().toISOString(),
          status: 'CONFIRMED'
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CONFIRMATION_ERROR',
          message: error.message
        }
      });
    }
  });

  // Get confirmations for a transaction
  fastify.get('/confirmation/:transactionId', async (request, reply) => {
    try {
      const { transactionId } = request.params;
      
      // TODO: Buscar confirmações do banco
      const confirmations = [];
      
      return {
        success: true,
        data: {
          transactionId,
          confirmations,
          required: 2,
          current: confirmations.length,
          status: confirmations.length >= 2 ? 'COMPLETED' : 'PENDING'
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message
        }
      });
    }
  });

  // Resend confirmation OTP
  fastify.post('/confirmation/resend', async (request, reply) => {
    try {
      const { transactionId, accountId } = request.body;
      
      // TODO: Gerar e enviar novo OTP
      
      return {
        success: true,
        message: 'OTP sent successfully',
        data: {
          transactionId,
          accountId,
          expiresIn: 300 // 5 minutes
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RESEND_ERROR',
          message: error.message
        }
      });
    }
  });

  // Get confirmation status
  fastify.get('/confirmation/status/:transactionId', async (request, reply) => {
    try {
      const { transactionId } = request.params;
      
      return {
        success: true,
        data: {
          transactionId,
          status: 'PENDING',
          confirmationsReceived: 0,
          confirmationsRequired: 2,
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: error.message
        }
      });
    }
  });
};
