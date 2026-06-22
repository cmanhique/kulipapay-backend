const { authenticate } = require('../middlewares/auth.middleware');
const { prisma } = require('../prisma');
const { handleError, ValidationError } = require('../utils/errors');

async function regionRoutes(fastify) {

  // ============================================
  // 1. CRIAR REGIÃO
  // ============================================
  fastify.post('/regions', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { code, name, currency, countryCode, timezone } = req.body;

      if (!code || !name) {
        throw new ValidationError('INVALID_DATA', 'Código e nome são obrigatórios');
      }

      const region = await prisma.region.create({
        data: {
          code,
          name,
          currency: currency || 'MZN',
          countryCode: countryCode || code,
          timezone: timezone || 'Africa/Maputo',
          isActive: true,
        },
      });

      return reply.send({
        success: true,
        data: region,
        message: 'Região criada com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 2. LISTAR REGIÕES
  // ============================================
  fastify.get('/regions', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { active } = req.query;

      const where = {};
      if (active === 'true') {
        where.isActive = true;
      }

      const regions = await prisma.region.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        data: regions,
        count: regions.length,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 3. OBTER REGIÃO POR ID
  // ============================================
  fastify.get('/regions/:id', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { id } = req.params;

      const region = await prisma.region.findUnique({
        where: { id },
        include: {
          merchants: {
            include: {
              region: true,
            },
          },
        },
      });

      if (!region) {
        throw new ValidationError('NOT_FOUND', 'Região não encontrada');
      }

      return reply.send({
        success: true,
        data: region,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 4. ATUALIZAR REGIÃO
  // ============================================
  fastify.patch('/regions/:id', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { name, currency, countryCode, timezone, isActive } = req.body;

      const region = await prisma.region.update({
        where: { id },
        data: {
          name: name || undefined,
          currency: currency || undefined,
          countryCode: countryCode || undefined,
          timezone: timezone || undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        },
      });

      return reply.send({
        success: true,
        data: region,
        message: 'Região atualizada com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 5. ASSOCIAR MERCHANT À REGIÃO
  // ============================================
  fastify.post('/merchant/region', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { regionId, localCurrency, taxId, businessReg, address, city, postalCode } = req.body;

      if (!regionId) {
        throw new ValidationError('INVALID_DATA', 'Region ID é obrigatório');
      }

      const region = await prisma.region.findUnique({
        where: { id: regionId },
      });

      if (!region) {
        throw new ValidationError('NOT_FOUND', 'Região não encontrada');
      }

      const existing = await prisma.merchantRegional.findUnique({
        where: {
          merchantId_regionId: {
            merchantId: merchantId,
            regionId: regionId,
          },
        },
      });

      if (existing) {
        throw new ValidationError('DUPLICATE', 'Merchant já está associado a esta região');
      }

      const merchantRegion = await prisma.merchantRegional.create({
        data: {
          merchantId: merchantId,
          regionId: regionId,
          localCurrency: localCurrency || region.currency,
          taxId: taxId || null,
          businessReg: businessReg || null,
          address: address || null,
          city: city || null,
          postalCode: postalCode || null,
        },
        include: {
          region: true,
        },
      });

      return reply.send({
        success: true,
        data: merchantRegion,
        message: 'Merchant associado à região com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 6. OBTER REGIÃO DO MERCHANT
  // ============================================
  fastify.get('/merchant/region', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;

      const merchantRegions = await prisma.merchantRegional.findMany({
        where: { merchantId },
        include: {
          region: true,
        },
      });

      return reply.send({
        success: true,
        data: merchantRegions,
        count: merchantRegions.length,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 7. REMOVER ASSOCIAÇÃO MERCHANT-REGIÃO
  // ============================================
  fastify.delete('/merchant/region/:regionId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { regionId } = req.params;

      // 🔥 CORRIGIDO: prisma.paymentRegional → prisma.paymentTransaction
      const payments = await prisma.paymentTransaction.count({
        where: {
          merchant_id: merchantId,
          region_id: regionId,
        },
      });

      if (payments > 0) {
        throw new ValidationError(
          'HAS_PAYMENTS',
          'Não é possível remover região com pagamentos associados'
        );
      }

      await prisma.merchantRegional.delete({
        where: {
          merchantId_regionId: {
            merchantId: merchantId,
            regionId: regionId,
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Associação removida com sucesso',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 8. STATS POR REGIÃO (LEDGER-FIRST)
  // ============================================
  fastify.get('/regions/stats', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;
      const { regionId, startDate, endDate } = req.query;

      const where = {
        kpId: merchantId,
        direction: 'CREDIT',
        eventType: 'SALE',
      };

      if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
      }

      const ledgerEntries = await prisma.ledger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const merchantRegions = await prisma.merchantRegional.findMany({
        where: { merchantId },
        include: {
          region: true,
        },
      });

      let targetRegions = merchantRegions;
      if (regionId) {
        targetRegions = merchantRegions.filter(mr => mr.regionId === regionId);
        if (targetRegions.length === 0) {
          throw new ValidationError('NOT_FOUND', 'Merchant não associado a esta região');
        }
      }

      const regionStats = {};
      targetRegions.forEach(mr => {
        regionStats[mr.regionId] = {
          regionId: mr.regionId,
          regionName: mr.region.name,
          regionCode: mr.region.code,
          totalSales: 0,
          totalFees: 0,
          totalNet: 0,
          count: 0,
        };
      });

      let totalSales = 0;
      let totalFees = 0;
      let totalNet = 0;

      ledgerEntries.forEach(entry => {
        const amount = Number(entry.amount);
        const fee = Number(entry.metadata?.fee || 0);
        const gross = Number(entry.metadata?.grossAmount || amount);

        if (targetRegions.length === 1) {
          const regionId = targetRegions[0].regionId;
          if (regionStats[regionId]) {
            regionStats[regionId].totalSales += gross;
            regionStats[regionId].totalFees += fee;
            regionStats[regionId].totalNet += amount;
            regionStats[regionId].count += 1;
          }
        } else {
          const regionIdFromMeta = entry.metadata?.regionId || null;
          if (regionIdFromMeta && regionStats[regionIdFromMeta]) {
            regionStats[regionIdFromMeta].totalSales += gross;
            regionStats[regionIdFromMeta].totalFees += fee;
            regionStats[regionIdFromMeta].totalNet += amount;
            regionStats[regionIdFromMeta].count += 1;
          } else {
            const firstRegion = targetRegions[0];
            if (firstRegion && regionStats[firstRegion.regionId]) {
              regionStats[firstRegion.regionId].totalSales += gross;
              regionStats[firstRegion.regionId].totalFees += fee;
              regionStats[firstRegion.regionId].totalNet += amount;
              regionStats[firstRegion.regionId].count += 1;
            }
          }
        }

        totalSales += gross;
        totalFees += fee;
        totalNet += amount;
      });

      return reply.send({
        success: true,
        data: {
          regions: Object.values(regionStats),
          total: {
            totalSales,
            totalFees,
            totalNet,
            count: ledgerEntries.length,
          },
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // 9. DASHBOARD GLOBAL (LEDGER-FIRST)
  // ============================================
  fastify.get('/dashboard/global', { preHandler: authenticate }, async (req, reply) => {
    try {
      const merchantId = req.user.kpId;

      const ledgerEntries = await prisma.ledger.findMany({
        where: {
          kpId: merchantId,
          direction: 'CREDIT',
          eventType: 'SALE',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const merchantRegions = await prisma.merchantRegional.findMany({
        where: { merchantId },
        include: {
          region: true,
        },
      });

      const regionMap = {};
      merchantRegions.forEach(mr => {
        regionMap[mr.regionId] = {
          region: mr.region,
          totalSales: 0,
          totalFees: 0,
          totalNet: 0,
          paymentCount: 0,
          recentPayments: [],
        };
      });

      let totalSales = 0;
      let totalFees = 0;
      let totalNet = 0;

      ledgerEntries.forEach(entry => {
        const amount = Number(entry.amount);
        const fee = Number(entry.metadata?.fee || 0);
        const gross = Number(entry.metadata?.grossAmount || amount);

        const regionIdFromMeta = entry.metadata?.regionId || null;
        let targetRegionId = null;

        if (regionIdFromMeta && regionMap[regionIdFromMeta]) {
          targetRegionId = regionIdFromMeta;
        } else if (merchantRegions.length === 1) {
          targetRegionId = merchantRegions[0].regionId;
        } else {
          targetRegionId = merchantRegions[0]?.regionId || null;
        }

        if (targetRegionId && regionMap[targetRegionId]) {
          regionMap[targetRegionId].totalSales += gross;
          regionMap[targetRegionId].totalFees += fee;
          regionMap[targetRegionId].totalNet += amount;
          regionMap[targetRegionId].paymentCount += 1;
          
          if (regionMap[targetRegionId].recentPayments.length < 5) {
            regionMap[targetRegionId].recentPayments.push({
              id: entry.id,
              amount: amount,
              description: entry.metadata?.description || 'Venda',
              createdAt: entry.createdAt,
            });
          }
        }

        totalSales += gross;
        totalFees += fee;
        totalNet += amount;
      });

      const regionSummary = Object.values(regionMap);
      const totalCount = regionSummary.reduce((sum, r) => sum + r.paymentCount, 0);

      return reply.send({
        success: true,
        data: {
          summary: {
            totalSales,
            totalFees,
            totalNet,
            totalCount,
            regionCount: merchantRegions.length,
          },
          byRegion: regionSummary,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = regionRoutes;