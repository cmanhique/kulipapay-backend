/**
 * IDENTITY LAYER
 * Ponto de entrada unificado
 */

// Access Model (fonte única)
const AccessModel = require('./access/access.model');

// UI Registry (separado)
const UIRegistry = require('./ui/ui.registry');

// Permissions Engine
const PermissionsEngine = require('./permissions/permissions.engine');

// Me Service
const MeService = require('./me/me.service');

// Types
const { ACCOUNT_TYPES, SESSION_STATUS, PERMISSION_LEVELS } = require('./session/session.types');

module.exports = {
  // Core
  AccessModel,
  UIRegistry,
  PermissionsEngine,
  MeService,
  
  // Types
  ACCOUNT_TYPES,
  SESSION_STATUS,
  PERMISSION_LEVELS
};
