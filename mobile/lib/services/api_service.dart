import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class ApiService {
  // ============================================
  // SINGLETON
  // ============================================
  static final ApiService instance = ApiService._internal();
  ApiService._internal();

  // ============================================
  // PROPRIEDADES
  // ============================================
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final http.Client _client = http.Client();
  String? _cachedToken;

  // ============================================
  // CONFIG
  // ============================================
  String get baseUrl => '${AppConfig.apiUrl}/api';

  // ============================================
  // GETTERS
  // ============================================
  String? get token => _cachedToken;

  Future<String?> getToken() async {
    return _cachedToken ?? await _storage.read(key: 'auth_token');
  }

  // ============================================
  // INIT
  // ============================================
  Future<void> init() async {
    _cachedToken = await _storage.read(key: 'auth_token');
    print('[ApiService] inicializado: ${_cachedToken != null ? "token OK" : "sem token"}');
  }

  // ============================================
  // TOKEN
  // ============================================
  Future<void> setToken(String token) async {
    _cachedToken = token;
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<void> clearToken() async {
    _cachedToken = null;
    await _storage.delete(key: 'auth_token');
  }

  // ============================================
  // HEADERS
  // ============================================
  Future<Map<String, String>> _getHeaders() async {
    return {
      'Content-Type': 'application/json',
      if (_cachedToken != null) 'Authorization': 'Bearer $_cachedToken',
    };
  }

  // ============================================
  // MÉTODOS GENÉRICOS SEGUROS (PRIVADOS)
  // ============================================
  Future<Map<String, dynamic>> _post(
    String url,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    final response = await _client.post(
      Uri.parse(url),
      headers: headers ?? await _getHeaders(),
      body: json.encode(body),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> _get(
    String url, {
    Map<String, String>? headers,
  }) async {
    final response = await _client.get(
      Uri.parse(url),
      headers: headers ?? await _getHeaders(),
    );
    return _decode(response);
  }

  // ============================================
  // MÉTODOS PÚBLICOS GET/POST
  // ============================================
  Future<Map<String, dynamic>> get(String path) async {
    return _get('$baseUrl$path');
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    return _post('$baseUrl$path', body);
  }

  // ============================================
  // DECODE SEGURO
  // ============================================
  Map<String, dynamic> _decode(http.Response response) {
    final body = json.decode(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    throw Exception(body['message'] ?? body['error'] ?? 'Request failed');
  }

  // ============================================
  // AUTH
  // ============================================

  Future<Map<String, dynamic>> register(
    String email,
    String phone,
    String password, {
    String name = '',
    String country = 'MZ',
    String accountType = 'INDIVIDUAL',
    Map<String, dynamic> extraData = const {},
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'phone': phone,
        'password': password,
        'name': name,
        'country': country,
        'accountType': accountType,
        ...extraData,
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final token = data['accessToken'] ?? data['token'];
      if (token != null) {
        await setToken(token);
      }
      return data;
    } else {
      final error = json.decode(response.body);
      throw Exception(error['message'] ?? 'Registration failed');
    }
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    print('[LOGIN] identifier=$identifier');
    print('[LOGIN] url=$baseUrl/auth/login');

    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'identifier': identifier,
          'password': password,
        }),
      );

      print('[LOGIN] status=${response.statusCode}');
      print('[LOGIN] body=${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final token = data['accessToken'] ?? data['token'];

        if (token != null) {
          await setToken(token);
        }

        return data;
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Login failed');
      }
    } catch (e) {
      print('[LOGIN] network_error=$e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> me() async {
    return _get('$baseUrl/auth/me');
  }

  Future<void> logout() async {
    try {
      await _post('$baseUrl/auth/logout', {});
    } catch (_) {}
    await clearToken();
  }

  // ============================================
  // WALLET
  // ============================================

  Future<double> balance() async {
    final data = await _get('$baseUrl/wallet/balance');
    return (data['balance'] ?? 0).toDouble();
  }

  Future<List<dynamic>> transactions() async {
    final data = await _get('$baseUrl/wallet/transactions');
    
    // 🔥 CORREÇÃO: Extrai a lista real de transações
    return data['data']?['transactions'] ?? [];
  }

  Future<double> deposit(double amount) async {
    final data = await _post('$baseUrl/wallet/deposit', {'amount': amount});
    return (data['balance'] ?? 0).toDouble();
  }

  Future<double> transfer(String toAccount, double amount) async {
    final data = await _post('$baseUrl/wallet/transfer', {
      'toAccount': toAccount,
      'amount': amount,
    });
    return (data['fromBalance'] ?? 0).toDouble();
  }

  // ============================================
  // MERCHANT
  // ============================================

  Future<Map<String, dynamic>> merchantDashboard() async {
    return _get('$baseUrl/merchant/dashboard');
  }

  Future<Map<String, dynamic>> merchantStats() async {
    return _get('$baseUrl/merchant/stats');
  }

  // ============================================
  // REGIONS
  // ============================================

  Future<Map<String, dynamic>> regions() async {
    return _get('$baseUrl/regions/regions');
  }

  Future<Map<String, dynamic>> globalDashboard() async {
    return _get('$baseUrl/regions/dashboard/global');
  }

  // ============================================
  // ADMIN
  // ============================================

  Future<Map<String, dynamic>> getAdminStats() async {
    return _get('$baseUrl/admin/stats');
  }

  Future<Map<String, dynamic>> getAdminUsers({int page = 1, String search = ''}) async {
    return _get('$baseUrl/admin/users?page=$page&limit=50&search=$search');
  }

  Future<void> toggleBlockUser(String kpId) async {
    await _post('$baseUrl/admin/users/$kpId/toggle-block', {});
  }

  Future<Map<String, dynamic>> getChartData() async {
    return _get('$baseUrl/admin/chart-data');
  }

  // ============================================
  // AGENT
  // ============================================

  Future<Map<String, dynamic>> getAgentStats(String agentKpId) async {
    return _get('$baseUrl/agent/stats');
  }

  // ============================================
  // AGENT CASH (UNIFICADO)
  // ============================================

  Future<Map<String, dynamic>> initiateCashIn({
    required String customerPhone,
    required double amount,
    required String agentPin,
  }) async {
    return _post('$baseUrl/agent-cash/cash-in/init', {
      'customerPhone': customerPhone,
      'amount': amount,
      'agentPin': agentPin,
    });
  }

  Future<Map<String, dynamic>> confirmCashIn({
    required String transactionRef,
    required String customerPin,
  }) async {
    return _post('$baseUrl/agent-cash/cash-in/confirm', {
      'transactionRef': transactionRef,
      'customerPin': customerPin,
    });
  }

  Future<Map<String, dynamic>> initiateCashOut({
    required String customerPhone,
    required double amount,
    required String agentPin,
  }) async {
    return _post('$baseUrl/agent-cash/cash-out/init', {
      'customerPhone': customerPhone,
      'amount': amount,
      'agentPin': agentPin,
    });
  }

  Future<Map<String, dynamic>> confirmCashOut({
    required String transactionRef,
    required String customerPin,
  }) async {
    return _post('$baseUrl/agent-cash/cash-out/confirm', {
      'transactionRef': transactionRef,
      'customerPin': customerPin,
    });
  }

  // ============================================
  // CASHIER
  // ============================================

  Future<Map<String, dynamic>> cashierLogin(Map<String, dynamic> body) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/cashier/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(body),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final token = data['accessToken'] ?? data['token'];
      if (token != null) {
        await setToken(token);
      }
      return data;
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Cashier login failed');
    }
  }

  Future<Map<String, dynamic>> cashierDashboard() async {
    return _get('$baseUrl/cashier/dashboard');
  }

  // ============================================
  // KYC
  // ============================================

  Future<Map<String, dynamic>> submitKyc(Map<String, dynamic> data) async {
    return _post('$baseUrl/kyc/submit', data);
  }

  Future<Map<String, dynamic>> getKycStatus() async {
    return _get('$baseUrl/kyc/status');
  }

  // ============================================
  // QR CODE
  // ============================================

  Future<Map<String, dynamic>> generateQRCode(double amount, String description) async {
    return _post('$baseUrl/qr/generate', {
      'amount': amount,
      'description': description,
    });
  }

  Future<Map<String, dynamic>> payWithQRCode(String qrCode) async {
    return _post('$baseUrl/qr/pay', {'qrCode': qrCode});
  }

  // ============================================
  // v2 - 2FA e BOOTSTRAP
  // ============================================

  Future<Map<String, dynamic>> getBootstrap() async {
    final response = await _client.get(
      Uri.parse('$baseUrl/public/bootstrap'),
      headers: {'Content-Type': 'application/json'},
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> loginV2(String identifier, String password) async {
    print('[LOGIN V2] identifier=$identifier');

    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'identifier': identifier,
          'password': password,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode != 200) {
        throw Exception(data['message'] ?? 'Login failed');
      }

      if (data['requiresTwoFactor'] == true) {
        return {
          'requiresTwoFactor': true,
          'kp_id': data['kp_id'],
          'message': data['message'] ?? 'Código OTP enviado',
        };
      }

      final token = data['accessToken'] ?? data['token'];
      if (token != null) {
        await setToken(token);
        return {
          'success': true,
          'token': token,
          'refreshToken': data['refreshToken'],
          'account': data['account'],
        };
      }

      return data;
    } catch (e) {
      print('[LOGIN V2] error=$e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOtpV2(String kpId, String code) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/auth/otp/verify'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'kp_id': kpId,
        'code': code,
      }),
    );

    final data = json.decode(response.body);

    if (response.statusCode == 200) {
      final token = data['accessToken'] ?? data['token'];
      if (token != null) {
        await setToken(token);
      }
      return data;
    } else {
      throw Exception(data['message'] ?? 'OTP verification failed');
    }
  }

  Future<Map<String, dynamic>> generateOtpV2(String identifier) async {
    return _post('$baseUrl/auth/otp/generate', {'identifier': identifier});
  }

  // ============================================
  // PIN
  // ============================================

  Future<void> setPin(String pin) async {
    await _post('$baseUrl/security/pin/set', {'pin': pin});
  }

  Future<void> verifyPin(String pin) async {
    await _post('$baseUrl/security/pin/verify', {'pin': pin});
  }

  Future<bool> hasPin() async {
    final data = await _get('$baseUrl/security/pin/status');
    return data['hasPin'] ?? false;
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  Future<Map<String, dynamic>> requestPasswordReset(String identifier) async {
    return _post('$baseUrl/auth/forgot-password', {'identifier': identifier});
  }

  Future<Map<String, dynamic>> resetPassword(String token, String newPassword) async {
    return _post('$baseUrl/auth/reset-password', {
      'token': token,
      'newPassword': newPassword,
    });
  }

  // ============================================
  // DISPOSE
  // ============================================
  void dispose() {
    _client.close();
  }
}