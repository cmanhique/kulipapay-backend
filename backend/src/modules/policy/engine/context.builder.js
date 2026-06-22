/**
 * CONTEXT BUILDER
 * 
 * 🎯 Constrói o contexto completo para avaliação de políticas
 * 
 * Responsabilidades:
 * 1. Buscar dados do utilizador (AccountService)
 * 2. Buscar wallet (WalletService)
 * 3. Buscar access (AccessService)
 * 4. Montar contexto unificado
 */

const AccountService = require('../../identity/services/account.service');
const WalletService = require('../../identity/services/wallet.service');
const AccessService = require('../../identity/services/access.service');

class ContextBuilder {
  
  /**
   * Construir contexto completo para avaliação
   */
  static async build(kp_id, module, action, extra = {}) {
    // 1. Buscar conta com KYC
    const account = await AccountService.get(kp_id);
    
    // 2. Buscar wallet
    const wallet = await WalletService.get(kp_id);
    
    // 3. Buscar access
    const access = AccessService.build(account);
    
    // 4. Montar contexto unificado
    return {
      // Dados do utilizador
      account: {
        kp_id: account.kp_id,
        account_type: account.account_type,
        role: account.role,
        status: account.status,
        kyc_status: account.kyc_status,
        kyc: account.kyc
      },
      
      // Dados da wallet
      wallet: {
        balance: wallet.balance,
        version: wallet.version
      },
      
      // Dados de acesso
      access: {
        modules: access.permissions.modules,
        actions: access.permissions.actions,
        limits: access.constraints.limits
      },
      
      // Ação a ser avaliada
      action: {
        module: module,
        action: action
      },
      
      // Dados adicionais
      extra: extra,
      
      // Timestamp
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ContextBuilder;
