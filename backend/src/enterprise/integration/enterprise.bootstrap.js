const { prisma } = require('../../prisma');
const { getEnterpriseConfig } = require('../enterprise.config');
const { enterpriseBus, publish } = require('./enterprise.bus');
const { attachEnterpriseListener } = require('./enterprise.listener');

const TARGET_MODELS = new Set([
  'Transaction',
  'TransactionLedger',
  'PaymentTransaction',
  'Wallet',
]);

const globalState = globalThis.__enterpriseOverlayBootstrapState || {
  initialized: false,
  middlewareInstalled: false,
  listenerAttached: false,
  config: null,
  lastStatus: null,
};

globalThis.__enterpriseOverlayBootstrapState = globalState;

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function buildPrismaMutationEvent(params, result, meta = {}) {
  if (!params || !params.model || !TARGET_MODELS.has(params.model)) {
    return null;
  }

  return {
    model: params.model,
    action: params.action,
    args: clonePlain(params.args || {}),
    result: clonePlain(result),
    durationMs: meta.durationMs ?? null,
    observedAt: meta.observedAt || new Date().toISOString(),
    source: 'prisma.middleware',
  };
}

function installPrismaMiddleware(config) {
  if (globalState.middlewareInstalled) {
    return true;
  }

  if (typeof prisma.$use !== 'function') {
    console.warn('[enterprise.bootstrap] Prisma middleware API not available');
    return false;
  }

  prisma.$use(async (params, next) => {
    const startedAt = Date.now();
    const result = await next(params);

    try {
      const event = buildPrismaMutationEvent(params, result, {
        durationMs: Date.now() - startedAt,
      });

      if (event) {
        publish('prisma.mutation', event);
      }
    } catch (error) {
      console.warn('[enterprise.bootstrap] mutation tap failed:', error.message);
    }

    return result;
  });

  globalState.middlewareInstalled = true;
  return true;
}

function initializeEnterpriseIntegration(overrides = {}) {
  if (globalState.initialized) {
    return clonePlain(globalState.lastStatus);
  }

  const config = getEnterpriseConfig(overrides);
  globalState.config = config;

  if (!config.enabled) {
    globalState.initialized = true;
    globalState.lastStatus = {
      enabled: false,
      mode: config.mode,
      auditEnabled: config.auditEnabled,
      policyEnabled: config.policyEnabled,
      middlewareInstalled: false,
      listenerAttached: false,
      targetModels: [...TARGET_MODELS],
    };
    return clonePlain(globalState.lastStatus);
  }

  const listenerDetach = attachEnterpriseListener(enterpriseBus, config);
  globalState.listenerAttached = typeof listenerDetach === 'function';
  globalState.listenerDetach = listenerDetach;
  const middlewareInstalled = installPrismaMiddleware(config);

  globalState.initialized = true;
  globalState.lastStatus = {
    enabled: true,
    mode: config.mode,
    auditEnabled: config.auditEnabled,
    policyEnabled: config.policyEnabled,
    middlewareInstalled,
    listenerAttached: globalState.listenerAttached,
    targetModels: [...TARGET_MODELS],
  };

  return clonePlain(globalState.lastStatus);
}

function getEnterpriseIntegrationStatus() {
  if (!globalState.lastStatus) {
    return {
      enabled: false,
      initialized: false,
      middlewareInstalled: false,
      listenerAttached: false,
      targetModels: [...TARGET_MODELS],
    };
  }

  return clonePlain({
    ...globalState.lastStatus,
    initialized: globalState.initialized,
  });
}

function resetEnterpriseIntegration() {
  if (typeof globalState.listenerDetach === 'function') {
    try {
      globalState.listenerDetach();
    } catch {
      // noop
    }
  }

  globalState.initialized = false;
  globalState.middlewareInstalled = false;
  globalState.listenerAttached = false;
  globalState.config = null;
  globalState.lastStatus = null;
  globalState.listenerDetach = null;
}

module.exports = {
  initializeEnterpriseIntegration,
  getEnterpriseIntegrationStatus,
  resetEnterpriseIntegration,
  buildPrismaMutationEvent,
  TARGET_MODELS,
};
