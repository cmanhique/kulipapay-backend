function parseBoolean(value, defaultValue = false) {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function normalizeMode(value) {
  const mode = String(value || 'shadow').trim().toLowerCase();

  if (mode === 'off' || mode === 'shadow' || mode === 'observe' || mode === 'observer') {
    return mode === 'observe' || mode === 'observer' ? 'shadow' : mode;
  }

  return 'shadow';
}

function getEnterpriseConfig(overrides = {}) {
  const mode = normalizeMode(overrides.mode ?? process.env.ENTERPRISE_MODE);
  const auditEnabled = parseBoolean(
    overrides.auditEnabled ?? process.env.ENTERPRISE_AUDIT,
    true
  );
  const policyEnabled = parseBoolean(
    overrides.policyEnabled ?? process.env.ENTERPRISE_POLICY,
    false
  );

  return {
    mode,
    enabled: mode !== 'off',
    shadowMode: mode === 'shadow',
    auditEnabled,
    policyEnabled,
    tapTransactions: true,
    tapPayments: true,
    tapLedger: true,
    tapWallet: true,
  };
}

const DEFAULT_ENTERPRISE_CONFIG = getEnterpriseConfig();

module.exports = {
  parseBoolean,
  normalizeMode,
  getEnterpriseConfig,
  DEFAULT_ENTERPRISE_CONFIG,
};
