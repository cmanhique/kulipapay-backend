const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');
const { resolveEnterprise } = require('../utils/account-resolver');

async function enterpriseRoutes(fastify) {
  fastify.post('/enterprise/kyc/license', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { licenseUrl } = req.body;
      if (!licenseUrl) {
        throw new ValidationError('MISSING_LICENSE', 'URL da licença comercial é obrigatória');
      }

      const resolved = await resolveEnterprise(req.user.kpId);
      if (!resolved) {
        throw new ValidationError('ENTERPRISE_NOT_FOUND', 'Conta empresarial não encontrada');
      }

      const profile = await prisma.enterpriseProfile.update({
        where: { account_id: resolved.accountId },
        data: {
          business_license_url: licenseUrl,
          status: 'ACTIVE',
        },
      });

      return reply.send({
        success: true,
        data: profile,
        message: 'Licença comercial registada. Conta activada.',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  fastify.get('/enterprise/profile', { preHandler: authenticate }, async (req, reply) => {
    try {
      const resolved = await resolveEnterprise(req.user.kpId);
      if (!resolved) {
        throw new ValidationError('ENTERPRISE_NOT_FOUND', 'Conta empresarial não encontrada');
      }

      return reply.send({
        success: true,
        data: {
          ...resolved.enterpriseProfile,
          kyc_complete: Boolean(resolved.enterpriseProfile.business_license_url),
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = enterpriseRoutes;
