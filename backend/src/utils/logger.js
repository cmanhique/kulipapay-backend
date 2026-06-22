// Logger simples para desenvolvimento
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args),
  fatal: (...args) => console.error('[FATAL]', ...args),
  trace: (...args) => console.trace('[TRACE]', ...args)
};

module.exports = logger;
