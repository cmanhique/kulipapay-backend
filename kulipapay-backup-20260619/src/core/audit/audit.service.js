/**
 * AUDIT SERVICE
 * 
 * 🎯 Registo de todas as decisões e ações do sistema
 * 
 * Princípios:
 * 1. Toda decisão do Policy Engine é registada
 * 2. Toda ação crítica é registada
 * 3. Rastreabilidade completa
 * 4. Imutável (append-only)
 */

const { prisma } = require('../../prisma');

class AuditService {
  
  /**
   * Registrar uma decisão do Policy Engine
   */
  static async logPolicyDecision(kp_id, module, action, decision, context = {}) {
    try {
      const auditEntry = await prisma.auditLog.create({
        data: {
          kp_id: kp_id,
          action: 'POLICY_DECISION',
          module: module,
          details: {
            action: action,
            decision: decision,
            context: context
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'policy_engine'
          }
        }
      });
      
      return auditEntry;
    } catch (error) {
      // Se não houver tabela de audit, log apenas no console
      console.log('📝 AUDIT:', {
        kp_id,
        action: 'POLICY_DECISION',
        module,
        action,
        decision,
        context
      });
    }
  }
  
  /**
   * Registrar uma ação do utilizador
   */
  static async logUserAction(kp_id, action, module, details = {}) {
    try {
      const auditEntry = await prisma.auditLog.create({
        data: {
          kp_id: kp_id,
          action: action,
          module: module,
          details: details,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'user_action'
          }
        }
      });
      
      return auditEntry;
    } catch (error) {
      console.log('📝 USER_ACTION:', {
        kp_id,
        action,
        module,
        details
      });
    }
  }
  
  /**
   * Registrar um evento do sistema
   */
  static async logSystemEvent(event, data = {}) {
    console.log('📡 SYSTEM_EVENT:', {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Buscar logs de um utilizador
   */
  static async getUserLogs(kp_id, limit = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: { kp_id },
        orderBy: { created_at: 'desc' },
        take: limit
      });
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Buscar logs por ação
   */
  static async getLogsByAction(action, limit = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: { action },
        orderBy: { created_at: 'desc' },
        take: limit
      });
    } catch (error) {
      return [];
    }
  }
}

module.exports = AuditService;
