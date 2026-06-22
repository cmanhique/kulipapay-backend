const { randomUUID } = require('crypto');

function clonePlain(value) {
  if (value == null) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

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

class EnterpriseModel {
  constructor(input = {}) {
    const source = input || {};

    this.id = source.id || randomUUID();
    this.name = typeof source.name === 'string' ? source.name.trim() : '';
    this.status = typeof source.status === 'string' ? source.status.trim() : 'PENDING';
    this.settings = clonePlain(source.settings || {});
    this.createdAt = toIso(source.createdAt);
  }

  static from(input = {}) {
    return new EnterpriseModel(input);
  }

  static create(input = {}) {
    return new EnterpriseModel(input).toJSON();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      settings: clonePlain(this.settings || {}),
      createdAt: this.createdAt,
    };
  }
}

module.exports = EnterpriseModel;
