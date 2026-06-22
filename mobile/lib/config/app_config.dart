class AppConfig {
  // URLs da API
  static const String apiUrlDev = 'http://localhost:3000';
  static const String apiUrlProd = 'https://kulipapay-backend.onrender.com'; // ← URL do Render
  
  // Alternar entre desenvolvimento e produção
  static const bool isProduction = false; // ← Mudar para true quando em produção
  
  static String get apiUrl {
    return isProduction ? apiUrlProd : apiUrlDev;
  }
}
