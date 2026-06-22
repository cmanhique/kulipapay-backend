const EnterpriseModel = require('../models/enterprise.model');

const enterpriseStore = new Map();

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeEnterprise(input = {}) {
  return EnterpriseModel.create(input);
}

function createEnterprise(input = {}) {
  const enterprise = normalizeEnterprise(input);
  enterpriseStore.set(enterprise.id, enterprise);
  return clonePlain(enterprise);
}

function upsertEnterprise(input = {}) {
  if (input?.id && enterpriseStore.has(input.id)) {
    return updateEnterprise(input.id, input);
  }

  return createEnterprise(input);
}

function updateEnterprise(id, patch = {}) {
  if (!id || !enterpriseStore.has(id)) {
    return null;
  }

  const current = enterpriseStore.get(id);
  const updated = EnterpriseModel.create({
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    settings: {
      ...(current.settings || {}),
      ...(patch.settings || {}),
    },
  });

  enterpriseStore.set(id, updated);
  return clonePlain(updated);
}

function getEnterprise(id) {
  if (!id || !enterpriseStore.has(id)) {
    return null;
  }

  return clonePlain(enterpriseStore.get(id));
}

function listEnterprises(filter = {}) {
  const records = [...enterpriseStore.values()];

  return records
    .filter((enterprise) => {
      if (filter.status && enterprise.status !== filter.status) return false;
      if (filter.name && enterprise.name !== filter.name) return false;
      return true;
    })
    .map((enterprise) => clonePlain(enterprise));
}

function setEnterpriseSettings(id, settings = {}) {
  return updateEnterprise(id, {
    settings: {
      ...(getEnterprise(id)?.settings || {}),
      ...clonePlain(settings),
    },
  });
}

function archiveEnterprise(id) {
  return updateEnterprise(id, {
    status: 'ARCHIVED',
  });
}

function getEnterpriseStoreSnapshot() {
  return listEnterprises();
}

function onTransactionCreated() {
  return {
    hooked: false,
    connected: false,
    reason: 'ENTERPRISE_OVERLAY_NOT_CONNECTED',
    hook: 'onTransactionCreated',
  };
}

function onPaymentProcessed() {
  return {
    hooked: false,
    connected: false,
    reason: 'ENTERPRISE_OVERLAY_NOT_CONNECTED',
    hook: 'onPaymentProcessed',
  };
}

function onLedgerUpdated() {
  return {
    hooked: false,
    connected: false,
    reason: 'ENTERPRISE_OVERLAY_NOT_CONNECTED',
    hook: 'onLedgerUpdated',
  };
}

module.exports = {
  enterpriseStore,
  createEnterprise,
  upsertEnterprise,
  updateEnterprise,
  getEnterprise,
  listEnterprises,
  setEnterpriseSettings,
  archiveEnterprise,
  getEnterpriseStoreSnapshot,
  onTransactionCreated,
  onPaymentProcessed,
  onLedgerUpdated,
};
