/**
 * BOOTSTRAP PUBLIC CONTROLLER
 * 
 * 🎯 Versão pública do bootstrap (sem autenticação)
 * Retorna apenas dados públicos: versão, configs, recursos disponíveis
 */

const { prisma } = require('../../prisma');

class BootstrapPublicController {
  /**
   * GET /api/public/bootstrap
   * Dados públicos para o frontend (sem auth)
   */
  static async getPublicBootstrap(req, reply) {
    try {
      // Dados públicos - não inclui informações de usuário
      const bootstrap = {
        app: {
          name: 'KulipaPay',
          version: '2.0.0',
          environment: process.env.NODE_ENV || 'development',
          status: 'operational'
        },
        config: {
          currency: 'MZN',
          languages: ['pt', 'en'],
          defaultLanguage: 'pt',
          timezone: 'Africa/Maputo',
          dateFormat: 'DD/MM/YYYY'
        },
        features: {
          wallet: true,
          transfer: true,
          payment: true,
          escrow: true,
          merchant: true,
          agent: true,
          mpesa: true,
          emola: true
        },
        modules: {
          available: ['wallet', 'transfer', 'payment', 'history', 'profile'],
          requiresAuth: ['wallet', 'transfer', 'payment', 'history']
        },
        limits: {
          maxTransferAmount: 100000,
          minTransferAmount: 1,
          dailyTransferLimit: 500000,
          dailyWithdrawalLimit: 200000
        },
        fees: {
          transfer: 0.02, // 2%
          withdrawal: 0.01, // 1%
          deposit: 0
        },
        auth: {
          methods: ['email', 'phone', 'otp'],
          requiresTwoFactor: true,
          sessionTimeout: 3600 // 1 hora
        },
        endpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register',
          forgotPassword: '/api/auth/forgot-password',
          wallet: '/api/wallet',
          transfer: '/api/transaction',
          payment: '/api/payment',
          websocket: 'ws://localhost:3000/ws'
        },
        timestamp: new Date().toISOString()
      };

      return reply.status(200).send({
        success: true,
        data: bootstrap
      });

    } catch (error) {
      console.error('Bootstrap public error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BOOTSTRAP_ERROR',
          message: 'Failed to load bootstrap data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = BootstrapPublicController;
