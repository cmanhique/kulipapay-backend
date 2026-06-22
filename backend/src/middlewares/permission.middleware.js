/**
 * PERMISSION MIDDLEWARE
 * 
 * 🎯 Middleware para verificar permissões
 * 
 * Uso: preHandler: [authenticate, requireModule('cashier')]
 */

const PermissionEngine = require('../identity/permissions/permissions.engine');

function requireModule(moduleName) {
  return async (request, reply) => {
    const account = request.user;
    
    if (!account) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const accountType = account.account_type;
    
    // Verificar se o módulo está disponível
    const modules = PermissionEngine.getModules(accountType);
    if (!modules.includes(moduleName)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Module '${moduleName}' not available for ${accountType}`,
          required: moduleName,
          available: modules
        }
      });
    }

    // Adicionar permissões ao request
    request.permissions = {
      modules: modules,
      canAccess: (mod) => modules.includes(mod)
    };
  };
}

function requireAction(moduleName, action) {
  return async (request, reply) => {
    const account = request.user;
    
    if (!account) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const accountType = account.account_type;
    
    // Verificar módulo
    const modules = PermissionEngine.getModules(accountType);
    if (!modules.includes(moduleName)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Module '${moduleName}' not available`
        }
      });
    }
    
    // Verificar ação
    const actions = PermissionEngine.getActions(accountType, moduleName);
    if (!actions.includes(action)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Action '${action}' not allowed on module '${moduleName}'`,
          allowedActions: actions
        }
      });
    }

    request.permissions = {
      modules: modules,
      actions: actions,
      canAccess: (mod) => modules.includes(mod),
      canPerform: (mod, act) => {
        if (mod === moduleName) {
          return actions.includes(act);
        }
        return false;
      }
    };
  };
}

module.exports = {
  requireModule,
  requireAction
};
