/**
 * POLICY ENGINE
 * 
 * 🎯 Motor único de decisão de políticas
 * 
 * Com:
 * - Cache (Redis/Memória)
 * - Audit Log (todas as decisões)
 * - WebSocket (notificações em tempo real)
 */

const ContextBuilder = require('./context.builder');
const CacheService = require('../../../core/cache/cache.service');
const RuleRegistry = require('../../../core/rules/rule.registry');
const AuditService = require('../../../core/audit/audit.service');
const WebSocketService = require('../../../core/websocket/websocket.service');

// Importar regras fixas
const fixedRules = [
  require('../rules/account.rule'),
  require('../rules/kyc.rule'),
  require('../rules/module.rule'),
  require('../rules/limits.rule'),
  require('../rules/feature.rule')
];

class PolicyEngine {
  
  static async evaluate(kp_id, module, action, extra = {}, useCache = true) {
    const cacheKey = CacheService.generateKey(kp_id, module, action);
    
    // 1. Verificar cache
    if (useCache) {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        // Registrar hit no audit
        await AuditService.logPolicyDecision(kp_id, module, action, {
          ...cached,
          cached: true
        });
        return cached;
      }
    }
    
    // 2. Construir contexto
    const context = await ContextBuilder.build(kp_id, module, action, extra);
    
    // 3. Executar pipeline de regras
    const results = [];
    let finalAllowed = true;
    let finalReason = null;
    let finalMetadata = {};
    
    const allRules = [
      ...fixedRules,
      ...RuleRegistry.getActiveRules()
    ];
    
    const sortedRules = allRules.sort((a, b) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      const result = rule.evaluate(context);
      results.push(result);
      
      if (!result.allowed && rule.breaksFlow) {
        finalAllowed = false;
        finalReason = result.reason;
        finalMetadata = result.metadata;
        break;
      }
      
      if (!result.allowed && !rule.breaksFlow) {
        finalReason = result.reason;
        finalMetadata = result.metadata;
      }
    }
    
    // 4. Montar resposta
    const response = {
      allowed: finalAllowed,
      decision: finalAllowed ? 'ALLOW' : 'DENY',
      reason: finalReason,
      metadata: finalMetadata,
      rules: results,
      timestamp: new Date().toISOString(),
      cached: false
    };
    
    // 5. Guardar em cache
    if (useCache) {
      const ttl = finalAllowed ? 60 : 30;
      await CacheService.set(cacheKey, response, ttl);
    }
    
    // 6. Registrar no audit log
    await AuditService.logPolicyDecision(kp_id, module, action, {
      ...response,
      cached: false
    });
    
    // 7. Notificar via WebSocket se houve mudança de permissão
    // (apenas se a decisão for DENY ou houve mudança)
    // Por enquanto, apenas notificar em DENY ou mudanças de regra
    
    return response;
  }
  
  static async evaluateBatch(kp_id, actions, extra = {}, useCache = true) {
    const results = {};
    
    for (const { module, action } of actions) {
      const key = `${module}:${action}`;
      results[key] = await this.evaluate(kp_id, module, action, extra, useCache);
    }
    
    return results;
  }
  
  static async invalidateCache(kp_id) {
    await CacheService.invalidateUser(kp_id);
    
    // Notificar via WebSocket
    WebSocketService.notifyPermissionChange(kp_id, {
      reason: 'CACHE_INVALIDATED',
      timestamp: new Date().toISOString()
    });
  }
  
  static async reloadRules() {
    await RuleRegistry.loadFromDatabase();
    
    // Invalidar cache de todos os utilizadores
    // (em produção, seria melhor invalidar apenas os afetados)
    // await CacheService.invalidate('policy:*');
    
    // Notificar admins
    WebSocketService.broadcastToAll({
      type: 'RULES_RELOADED',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = PolicyEngine;
