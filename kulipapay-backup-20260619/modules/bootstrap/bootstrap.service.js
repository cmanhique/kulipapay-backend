/**
 * BOOTSTRAP SERVICE
 * 
 * 🎯 Ponto de entrada único para o frontend
 * 
 * Consolida:
 * - Identity (account + wallet + access)
 * - UI (navigation + module_details)
 * - Features (feature flags)
 * - Configurações do tenant
 * 
 * 🚀 1 request → app pronto
 */

const IdentityFacade = require('../identity/identity.facade');
const UIService = require('../ui/ui.service');
const AccessService = require('../access/access.service');

class BootstrapService {
  
  /**
   * Obter todos os dados necessários para o frontend
   */
  static async getBootstrap(kp_id) {
    // 1. Buscar dados do identity (account + wallet + access)
    const identity = await IdentityFacade.getMe(kp_id);
    
    // 2. Buscar UI context (baseado no access)
    const ui = await UIService.getContext(identity.account, identity.access);
    
    // 3. Buscar features (feature flags)
    const features = await this.getFeatures(identity.account);
    
    // 4. Buscar configurações do tenant
    const config = await this.getConfig(identity.account);
    
    // 5. Montar resposta única
    return {
      // Utilizador
      user: {
        account: identity.account,
        wallet: identity.wallet,
        domain: identity.domain
      },
      
      // UI
      ui: {
        dashboard_type: ui.dashboard_type,
        navigation: ui.navigation,
        module_details: ui.module_details
      },
      
      // Access (permissões)
      access: {
        modules: identity.access.modules,
        actions: identity.access.actions,
        limits: identity.access.constraints?.limits || {}
      },
      
      // Features (feature flags)
      features: features,
      
      // Configurações
      config: config,
      
      // Métricas
      metrics: identity.metrics,
      
      // Metadata
      meta: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }
  
  /**
   * Obter feature flags
   */
  static async getFeatures(account) {
    // Baseado no tipo de conta e KYC status
    const features = {
      // Features base
      wallet: true,
      transfer: true,
      history: true,
      
      // Features por tipo de conta
      merchant: account.account_type === 'MERCHANT',
      agent: account.account_type === 'AGENT',
      business: account.account_type === 'BUSINESS',
      
      // Features por KYC
      kyc_approved: account.kyc_status === 'APPROVED',
      
      // Features específicas
      cashier: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      payments: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      settlements: account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED',
      
      // Features beta (por tenant)
      beta_features: false,
      
      // Features experimentais
      experimental: false
    };
    
    // Se for MERCHANT com KYC aprovado, ativar mais features
    if (account.account_type === 'MERCHANT' && account.kyc_status === 'APPROVED') {
      features.sales_reports = true;
      features.advanced_analytics = true;
    }
    
    return features;
  }
  
  /**
   * Obter configurações do tenant
   */
  static async getConfig(account) {
    // Baseado no tipo de conta
    const configs = {
      MERCHANT: {
        theme: 'merchant',
        currency: 'MZN',
        date_format: 'DD/MM/YYYY',
        timezone: 'Africa/Maputo'
      },
      INDIVIDUAL: {
        theme: 'individual',
        currency: 'MZN',
        date_format: 'DD/MM/YYYY',
        timezone: 'Africa/Maputo'
      },
      AGENT: {
        theme: 'agent',
        currency: 'MZN',
        date_format: 'DD/MM/YYYY',
        timezone: 'Africa/Maputo'
      },
      BUSINESS: {
        theme: 'business',
        currency: 'MZN',
        date_format: 'DD/MM/YYYY',
        timezone: 'Africa/Maputo'
      }
    };
    
    return configs[account.account_type] || configs.INDIVIDUAL;
  }
}

module.exports = BootstrapService;
