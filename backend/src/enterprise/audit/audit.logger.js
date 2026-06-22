const { randomUUID } = require('crypto');

function clonePlain(value) {
  if (value == null) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
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

function formatAuditRecord(level, message, details = {}, scope = {}) {
  return {
    id: randomUUID(),
    level,
    message,
    details: clonePlain(details),
    scope: clonePlain(scope),
    createdAt: toIso(),
  };
}

function emitToConsole(level, record) {
  const payload = {
    id: record.id,
    level: record.level,
    message: record.message,
    scope: record.scope,
    details: record.details,
    createdAt: record.createdAt,
  };

  if (level === 'error') {
    console.error('[enterprise.audit]', payload);
    return;
  }

  if (level === 'warn') {
    console.warn('[enterprise.audit]', payload);
    return;
  }

  console.log('[enterprise.audit]', payload);
}

function createAuditLogger(baseScope = {}) {
  const scope = clonePlain(baseScope || {});

  return {
    child(nextScope = {}) {
      return createAuditLogger({
        ...scope,
        ...clonePlain(nextScope || {}),
      });
    },

    log(message, details = {}) {
      const record = formatAuditRecord('INFO', message, details, scope);
      emitToConsole('log', record);
      return record;
    },

    info(message, details = {}) {
      const record = formatAuditRecord('INFO', message, details, scope);
      emitToConsole('log', record);
      return record;
    },

    warn(message, details = {}) {
      const record = formatAuditRecord('WARN', message, details, scope);
      emitToConsole('warn', record);
      return record;
    },

    error(message, details = {}) {
      const record = formatAuditRecord('ERROR', message, details, scope);
      emitToConsole('error', record);
      return record;
    },
  };
}

const auditLogger = createAuditLogger({
  namespace: 'enterprise.overlay',
});

module.exports = {
  createAuditLogger,
  auditLogger,
  formatAuditRecord,
};
