const DepartmentModel = require('../models/department.model');

const departmentStore = new Map();

function clonePlain(value) {
  if (value == null) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeDepartment(input = {}) {
  return DepartmentModel.create(input);
}

function createDepartment(input = {}) {
  const department = normalizeDepartment(input);
  departmentStore.set(department.id, department);
  return clonePlain(department);
}

function upsertDepartment(input = {}) {
  if (input?.id && departmentStore.has(input.id)) {
    return updateDepartment(input.id, input);
  }

  return createDepartment(input);
}

function updateDepartment(id, patch = {}) {
  if (!id || !departmentStore.has(id)) {
    return null;
  }

  const current = departmentStore.get(id);
  const updated = DepartmentModel.create({
    ...current,
    ...patch,
    id: current.id,
    enterpriseId: patch.enterpriseId ?? current.enterpriseId,
    createdAt: current.createdAt,
    budget: patch.budget == null ? current.budget : patch.budget,
    rules: patch.rules == null ? current.rules : patch.rules,
  });

  departmentStore.set(id, updated);
  return clonePlain(updated);
}

function getDepartment(id) {
  if (!id || !departmentStore.has(id)) {
    return null;
  }

  return clonePlain(departmentStore.get(id));
}

function listDepartments(filter = {}) {
  const records = [...departmentStore.values()];

  return records
    .filter((department) => {
      if (filter.enterpriseId && department.enterpriseId !== filter.enterpriseId) return false;
      if (filter.name && department.name !== filter.name) return false;
      return true;
    })
    .map((department) => clonePlain(department));
}

function listDepartmentsByEnterprise(enterpriseId) {
  return listDepartments({ enterpriseId });
}

function updateDepartmentBudget(id, budget = {}) {
  return updateDepartment(id, { budget });
}

function updateDepartmentRules(id, rules = {}) {
  return updateDepartment(id, { rules });
}

function archiveDepartment(id) {
  return updateDepartment(id, {
    rules: {
      ...(getDepartment(id)?.rules || {}),
      archived: true,
    },
  });
}

function getDepartmentStoreSnapshot() {
  return listDepartments();
}

module.exports = {
  departmentStore,
  createDepartment,
  upsertDepartment,
  updateDepartment,
  getDepartment,
  listDepartments,
  listDepartmentsByEnterprise,
  updateDepartmentBudget,
  updateDepartmentRules,
  archiveDepartment,
  getDepartmentStoreSnapshot,
};
