const { prisma } = require('../../prisma');
const EnterpriseService = require('./enterprise.service');
const DepartmentService = require('./department.service');

const scopeState = {
  currentScope: null,
  byUserId: new Map(),
  byTransactionId: new Map(),
};

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function toIso(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function normalizeEnterpriseSnapshot(enterprise = {}) {
  if (!enterprise) return null;

  return {
    id: enterprise.id || enterprise.enterpriseId || null,
    name: enterprise.name || enterprise.business_name || '',
    status: enterprise.status || 'PENDING',
    settings: clonePlain(enterprise.settings || {}),
    createdAt: toIso(enterprise.createdAt || enterprise.created_at),
    source: enterprise.source || 'enterprise.overlay',
    accountId: enterprise.accountId || enterprise.account_id || null,
    kpId: enterprise.kpId || enterprise.kp_id || null,
  };
}

function normalizeDepartmentSnapshot(department = {}) {
  if (!department) return null;

  return {
    id: department.id || null,
    enterpriseId: department.enterpriseId || department.enterprise_id || null,
    name: department.name || '',
    budget: clonePlain(department.budget || {}),
    rules: clonePlain(department.rules || {}),
    createdAt: toIso(department.createdAt || department.created_at),
    source: department.source || 'enterprise.overlay',
  };
}

async function resolveEnterprise(userId) {
  if (!userId) {
    return null;
  }

  const scoped = scopeState.byUserId.get(userId);
  if (scoped?.enterprise) {
    return clonePlain(scoped.enterprise);
  }

  const localEnterprise = EnterpriseService.getEnterprise(userId);
  if (localEnterprise) {
    return clonePlain(localEnterprise);
  }

  try {
    const account = await prisma.account.findFirst({
      where: {
        OR: [{ id: userId }, { kp_id: userId }],
        account_type: 'ENTERPRISE',
      },
      include: { enterpriseProfile: true },
    });

    if (!account?.enterpriseProfile) {
      return null;
    }

    return normalizeEnterpriseSnapshot({
      id: account.enterpriseProfile.id,
      name: account.enterpriseProfile.business_name,
      status: account.enterpriseProfile.status,
      settings: {},
      createdAt: account.enterpriseProfile.created_at,
      source: 'prisma',
      accountId: account.id,
      kpId: account.kp_id,
    });
  } catch {
    return null;
  }
}

async function resolveDepartment(transactionId) {
  if (!transactionId) {
    return null;
  }

  const scoped = scopeState.byTransactionId.get(transactionId);
  if (scoped?.department) {
    return clonePlain(scoped.department);
  }

  return null;
}

async function attachEnterpriseContext(input = {}) {
  const userId = input.userId || input.kpId || null;
  const transactionId = input.transactionId || input.transaction?.transactionId || input.transaction?.id || null;

  const enterprise =
    normalizeEnterpriseSnapshot(input.enterprise) ||
    (input.enterpriseId ? EnterpriseService.getEnterprise(input.enterpriseId) : null) ||
    (userId ? await resolveEnterprise(userId) : null);

  const department =
    normalizeDepartmentSnapshot(input.department) ||
    (input.departmentId ? DepartmentService.getDepartment(input.departmentId) : null) ||
    (transactionId ? await resolveDepartment(transactionId) : null);

  const scope = {
    userId,
    transactionId,
    enterprise,
    department,
    transaction: clonePlain(input.transaction || null),
    metadata: clonePlain(input.metadata || {}),
    source: input.source || 'enterprise.overlay',
    attachedAt: toIso(),
  };

  scopeState.currentScope = scope;

  if (userId) {
    scopeState.byUserId.set(userId, scope);
  }

  if (transactionId) {
    scopeState.byTransactionId.set(transactionId, scope);
  }

  return clonePlain(scope);
}

function getCurrentScope() {
  if (!scopeState.currentScope) {
    return {
      userId: null,
      transactionId: null,
      enterprise: null,
      department: null,
      transaction: null,
      metadata: {},
      source: 'enterprise.overlay',
      attachedAt: null,
    };
  }

  return clonePlain(scopeState.currentScope);
}

module.exports = {
  scopeState,
  resolveEnterprise,
  resolveDepartment,
  attachEnterpriseContext,
  getCurrentScope,
};
