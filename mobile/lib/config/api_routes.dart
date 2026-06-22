class ApiRoutes {
  // ============================================
  // v1 - ROTAS EXISTENTES (MANTIDAS)
  // ============================================
  
  // Auth
  static const String authRegister = '/api/auth/register';
  static const String authLogin = '/api/auth/login';
  static const String authRefresh = '/api/auth/refresh';
  static const String authMe = '/api/auth/me';
  static const String authLogout = '/api/auth/logout';
  static const String authForgotPassword = '/api/auth/forgot-password';
  static const String authResetPassword = '/api/auth/reset-password';

  // Wallet
  static const String walletBalance = '/api/wallet/balance';
  static const String walletDeposit = '/api/wallet/deposit';
  static const String walletTransfer = '/api/wallet/transfer';
  static const String walletTransactions = '/api/wallet/transactions';

  // Admin
  static const String adminStats = '/api/admin/stats';
  static const String adminUsers = '/api/admin/users';
  static const String adminUserBlock = '/api/admin/users';

  // KYC
  static const String kycStatus = '/api/kyc/status';
  static const String kycSubmit = '/api/kyc/submit';

  // QR Code
  static const String qrGenerate = '/api/qr/generate';
  static const String qrPay = '/api/qr/pay';

  // Security
  static const String pinSet = '/api/security/pin/set';
  static const String pinVerify = '/api/security/pin/verify';
  static const String pinStatus = '/api/security/pin/status';

  // Agent Cash
  static const String agentCashInInit = '/api/agent-cash/cash-in/init';
  static const String agentCashInConfirm = '/api/agent-cash/cash-in/confirm';
  static const String agentCashOutInit = '/api/agent-cash/cash-out/init';
  static const String agentCashOutConfirm = '/api/agent-cash/cash-out/confirm';

  // ============================================
  // v2 - NOVAS ROTAS (APENAS ADICIONADAS)
  // ============================================

  // Auth v2 (com 2FA)
  static const String v2AuthLogin = '/api/auth/login';
  static const String v2AuthOtpGenerate = '/api/auth/otp/generate';
  static const String v2AuthOtpVerify = '/api/auth/otp/verify';
  static const String v2AuthRefresh = '/api/auth/refresh';
  static const String v2AuthMe = '/api/auth/me';
  static const String v2AuthLogout = '/api/auth/logout';

  // Bootstrap (público)
  static const String bootstrap = '/api/public/bootstrap';

  // Transaction v2
  static const String v2Transaction = '/api/transaction';
  static const String v2TransactionConfirm = '/api/transaction/confirm';
  static const String v2TransactionReject = '/api/transaction/reject';
  static const String v2TransactionPending = '/api/transaction/pending';

  // Escrow v2
  static const String v2Escrow = '/api/escrow';
  static const String v2EscrowConfirm = '/api/escrow/confirm';
  static const String v2EscrowRelease = '/api/escrow/release';
  static const String v2EscrowDispute = '/api/escrow/dispute';
  static const String v2EscrowRefund = '/api/escrow/refund';

  // Wallet v2
  static const String v2WalletBalance = '/api/wallet/balance';
  static const String v2WalletTransfer = '/api/wallet/transfer';
  static const String v2WalletTransactions = '/api/wallet/transactions';

  // Admin v2
  static const String v2AdminStats = '/api/admin/stats';
  static const String v2AdminUsers = '/api/admin/users';
  static const String v2AdminTransactions = '/api/admin/transactions';
  static const String v2AdminKycPending = '/api/admin/kyc/pending';
  static const String v2AdminKycApprove = '/api/admin/kyc';
  static const String v2AdminFraudAlerts = '/api/admin/fraud/alerts';
  static const String v2AdminFraudResolve = '/api/admin/fraud/resolve';

  // Payment v2
  static const String v2PaymentDeposit = '/api/payment/deposit';
  static const String v2PaymentWithdraw = '/api/payment/withdraw';
  static const String v2PaymentStatus = '/api/payment/status';
  static const String v2PaymentTransactions = '/api/payment/transactions';

  // WebSocket (SSE)
  static const String websocket = 'ws://localhost:3000/ws';
  static const String websocketProd = 'wss://kulipapay-backend.onrender.com/ws';
}
