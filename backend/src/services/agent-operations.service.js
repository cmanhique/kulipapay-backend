const crypto = require('crypto');
const { prisma } = require('../prisma');
const { ValidationError } = require('../utils/errors');
const { resolveAgent } = require('../utils/account-resolver');
const accountValidation = require('./account-validation.service');
const CommissionEngine = require('../core/commission.engine');
const LedgerEngine = require('../core/ledger.engine');

class AgentOperationsService {
  async getDashboard(kpId) {
    const resolved = await resolveAgent(kpId);
    if (!resolved) {
      throw new ValidationError('AGENT_NOT_FOUND', 'Agente não encontrado');
    }

    const { agent } = resolved;

    return {
      deposits_volume: Number(agent.total_deposits_volume),
      withdrawals_volume: Number(agent.total_withdrawals_volume),
      commission_earned: Number(agent.total_commission_earned),
      float_balance: Number(agent.float_balance),
      deposit_commission_rate: agent.deposit_commission_rate,
      withdrawal_commission_rate: agent.withdrawal_commission_rate,
      kyc_complete: Boolean(agent.business_photo_url),
      status: agent.status,
    };
  }

  async uploadBusinessPhoto(kpId, photoUrl) {
    if (!photoUrl) {
      throw new ValidationError('MISSING_PHOTO', 'URL da foto é obrigatória');
    }

    const resolved = await resolveAgent(kpId);
    if (!resolved) {
      throw new ValidationError('AGENT_NOT_FOUND', 'Agente não encontrado');
    }

    return prisma.agent.update({
      where: { kp_id: kpId },
      data: {
        business_photo_url: photoUrl,
        status: 'ACTIVE',
      },
    });
  }

  async processCashIn({ agentKpId, customerKpId, amount }) {
    const resolved = await resolveAgent(agentKpId);
    if (!resolved) {
      throw new ValidationError('AGENT_NOT_FOUND', 'Agente não encontrado');
    }

    accountValidation.validateAgentKyc(resolved.agent);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
    }

    const commission = CommissionEngine.calculateAgentDepositCommission({
      amount: numAmount,
      commissionRate: resolved.agent.deposit_commission_rate,
    });

    const reference = `AGENT-IN-${crypto.randomUUID()}`;

    // Customer wallet receives deposit; agent earns commission credit
    await LedgerEngine.deposit({
      kp_id: customerKpId,
      amount: numAmount,
      description: `Cash-in via agent ${agentKpId}`,
    });

    if (commission.agentShare > 0) {
      await LedgerEngine.deposit({
        kp_id: agentKpId,
        amount: commission.agentShare,
        description: `Commission cash-in ${reference}`,
      });
    }

    await prisma.agent.update({
      where: { kp_id: agentKpId },
      data: {
        total_deposits_volume: { increment: numAmount },
        total_commission_earned: { increment: commission.agentShare },
      },
    });

    await prisma.transaction.create({
      data: {
        transactionId: reference,
        from_kp: agentKpId,
        to_kp: customerKpId,
        amount: numAmount,
        fee: commission.commission,
        status: 'SETTLED',
        mode: 'INSTANT',
        description: 'Agent cash-in',
        metadata: {
          type: 'AGENT_CASH_IN',
          commission: commission.agentShare,
          commission_rate: commission.commissionRate,
        },
      },
    });

    return { success: true, reference, amount: numAmount, commission };
  }

  async processCashOut({ agentKpId, customerKpId, amount }) {
    const resolved = await resolveAgent(agentKpId);
    if (!resolved) {
      throw new ValidationError('AGENT_NOT_FOUND', 'Agente não encontrado');
    }

    accountValidation.validateAgentKyc(resolved.agent);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new ValidationError('INVALID_AMOUNT', 'Valor inválido');
    }

    const commission = CommissionEngine.calculateAgentWithdrawalCommission({
      amount: numAmount,
      commissionRate: resolved.agent.withdrawal_commission_rate,
    });

    const reference = `AGENT-OUT-${crypto.randomUUID()}`;

    // Customer wallet debited; agent earns commission
    await LedgerEngine.transfer({
      fromKp: customerKpId,
      toKp: agentKpId,
      amount: numAmount,
      reference,
      description: `Cash-out via agent ${agentKpId}`,
      mode: 'INSTANT',
    });

    if (commission.agentShare > 0) {
      await LedgerEngine.deposit({
        kp_id: agentKpId,
        amount: commission.agentShare,
        description: `Commission cash-out ${reference}`,
      });
    }

    await prisma.agent.update({
      where: { kp_id: agentKpId },
      data: {
        total_withdrawals_volume: { increment: numAmount },
        total_commission_earned: { increment: commission.agentShare },
      },
    });

    await prisma.transaction.create({
      data: {
        transactionId: reference,
        from_kp: customerKpId,
        to_kp: agentKpId,
        amount: numAmount,
        fee: commission.commission,
        status: 'SETTLED',
        mode: 'INSTANT',
        description: 'Agent cash-out',
        metadata: {
          type: 'AGENT_CASH_OUT',
          commission: commission.agentShare,
          commission_rate: commission.commissionRate,
        },
      },
    });

    return { success: true, reference, amount: numAmount, commission };
  }
}

module.exports = new AgentOperationsService();
