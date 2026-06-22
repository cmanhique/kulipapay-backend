/**
 * Per-account-type validation rules for registration and operations.
 */
const { ValidationError } = require('../utils/errors');
const { isValidAccountType } = require('../utils/account-resolver');

const REGISTRATION_RULES = {
  INDIVIDUAL: {
    required: [],
    forbidden: ['businessName', 'businessType', 'taxId', 'industry'],
  },
  MERCHANT: {
    required: ['businessName'],
    optional: ['businessType', 'taxId'],
  },
  AGENT: {
    required: ['businessName', 'businessType'],
    optional: ['businessPhotoUrl'],
  },
  ENTERPRISE: {
    required: ['businessName'],
    optional: ['taxId', 'industry', 'businessLicenseUrl'],
  },
};

class AccountValidationService {
  validateRegistration(accountType, data = {}) {
    const type = accountType || 'INDIVIDUAL';

    if (type !== 'INDIVIDUAL' && !isValidAccountType(type)) {
      throw new ValidationError('INVALID_ACCOUNT_TYPE', `Tipo de conta inválido: ${type}`);
    }

    const rules = REGISTRATION_RULES[type] || REGISTRATION_RULES.INDIVIDUAL;

    for (const field of rules.required || []) {
      if (!data[field] || String(data[field]).trim().length === 0) {
        throw new ValidationError('MISSING_FIELD', `Campo obrigatório: ${field}`);
      }
    }

    return { accountType: type, rules };
  }

  validateAgentKyc(agent) {
    if (!agent) {
      throw new ValidationError('AGENT_NOT_FOUND', 'Perfil de agente não encontrado');
    }
    if (!agent.business_photo_url) {
      throw new ValidationError(
        'AGENT_KYC_INCOMPLETE',
        'Foto do negócio/banco é obrigatória para operar como agente'
      );
    }
    if (agent.status !== 'ACTIVE') {
      throw new ValidationError('AGENT_NOT_ACTIVE', 'Conta de agente não está activa');
    }
  }

  validateEnterpriseKyc(enterpriseProfile) {
    if (!enterpriseProfile) {
      throw new ValidationError('ENTERPRISE_NOT_FOUND', 'Perfil empresarial não encontrado');
    }
    if (!enterpriseProfile.business_license_url) {
      throw new ValidationError(
        'ENTERPRISE_KYC_INCOMPLETE',
        'Licença comercial é obrigatória para contas empresariais'
      );
    }
    if (enterpriseProfile.status !== 'ACTIVE') {
      throw new ValidationError('ENTERPRISE_NOT_ACTIVE', 'Conta empresarial não está activa');
    }
  }

  validateMerchantProfile(merchantProfile) {
    if (!merchantProfile) {
      throw new ValidationError('MERCHANT_NOT_FOUND', 'Perfil de comerciante não encontrado');
    }
    if (merchantProfile.status !== 'ACTIVE') {
      throw new ValidationError('MERCHANT_NOT_ACTIVE', 'Conta de comerciante não está activa');
    }
  }

  /**
   * Gate operations by account type before financial actions.
   */
  validateOperationAllowed(account, operation) {
    if (!account) {
      throw new ValidationError('ACCOUNT_NOT_FOUND', 'Conta não encontrada');
    }

    const type = account.account_type;

    const operationMatrix = {
      POS_RECEIVE: ['MERCHANT'],
      ISSUE_REFUND: ['MERCHANT'],
      AGENT_CASH_IN: ['AGENT'],
      AGENT_CASH_OUT: ['AGENT'],
      ENTERPRISE_TRANSFER: ['ENTERPRISE'],
    };

    const allowed = operationMatrix[operation];
    if (allowed && !allowed.includes(type)) {
      throw new ValidationError(
        'OPERATION_NOT_ALLOWED',
        `Operação ${operation} não permitida para tipo ${type}`
      );
    }
  }
}

module.exports = new AccountValidationService();
