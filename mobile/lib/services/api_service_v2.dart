import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_service.dart';
import '../config/app_config.dart';
import '../config/api_routes.dart';

/// ApiServiceV2 - Extensão do ApiService com suporte a v2
/// Mantém compatibilidade com v1 e adiciona novos métodos
class ApiServiceV2 {
  static final ApiServiceV2 _instance = ApiServiceV2._internal();
  factory ApiServiceV2() => _instance;
  static ApiServiceV2 get instance => _instance;

  final ApiService _base = ApiService.instance;
  String? _token;

  ApiServiceV2._internal();

  String get _baseUrl => AppConfig.apiUrl;

  // ============================================
  // TOKEN MANAGEMENT (usa o base)
  // ============================================

  Future<String?> getToken() async => _base.getToken();
  Future<void> setToken(String token) async => _base.setToken(token);

  // ============================================
  // BOOTSTRAP (PÚBLICO)
  // ============================================

  Future<Map<String, dynamic>> getBootstrap() async {
    final response = await http.get(
      Uri.parse('$_baseUrl${ApiRoutes.bootstrap}'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load bootstrap');
  }

  // ============================================
  // AUTH v2 (COM 2FA)
  // ============================================

  Future<Map<String, dynamic>> loginV2(String identifier, String password) async {
    final response = await http.post(
      Uri.parse('$_baseUrl${ApiRoutes.v2AuthLogin}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'identifier': identifier,
        'password': password,
      }),
    );

    final data = json.decode(response.body);

    if (response.statusCode == 200) {
      if (data['requiresTwoFactor'] == true) {
        return {
          'requiresTwoFactor': true,
          'kp_id': data['kp_id'],
          'message': data['message'] ?? 'Código OTP enviado',
        };
      }

      if (data['token'] != null) {
        _token = data['token'];
        await setToken(data['token']);
        return {
          'success': true,
          'token': data['token'],
          'refreshToken': data['refreshToken'],
          'account': data['account'],
        };
      }
    }

    throw Exception(data['message'] ?? 'Login failed');
  }

  Future<Map<String, dynamic>> verifyOtpV2(String kpId, String code) async {
    final response = await http.post(
      Uri.parse('$_baseUrl${ApiRoutes.v2AuthOtpVerify}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'kp_id': kpId,
        'code': code,
      }),
    );

    final data = json.decode(response.body);

    if (response.statusCode == 200 && data['token'] != null) {
      _token = data['token'];
      await setToken(data['token']);
      return {
        'success': true,
        'token': data['token'],
        'refreshToken': data['refreshToken'],
        'account': data['account'],
      };
    }

    throw Exception(data['message'] ?? 'OTP verification failed');
  }

  Future<Map<String, dynamic>> refreshTokenV2(String refreshToken) async {
    final response = await http.post(
      Uri.parse('$_baseUrl${ApiRoutes.v2AuthRefresh}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'refreshToken': refreshToken}),
    );

    final data = json.decode(response.body);

    if (response.statusCode == 200 && data['token'] != null) {
      _token = data['token'];
      await setToken(data['token']);
      return data;
    }

    throw Exception(data['message'] ?? 'Refresh failed');
  }

  // ============================================
  // TRANSACTION v2
  // ============================================

  Future<Map<String, dynamic>> transferV2({
    required String from,
    required String to,
    required double amount,
    String mode = 'INSTANT',
    String? description,
  }) async {
    final token = await getToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await http.post(
      Uri.parse('$_baseUrl${ApiRoutes.v2Transaction}'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: json.encode({
        'from': from,
        'to': to,
        'amount': amount,
        'mode': mode,
        'description': description,
      }),
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) return data;
    throw Exception(data['message'] ?? 'Transfer failed');
  }

  // ============================================
  // ESCROW v2
  // ============================================

  Future<Map<String, dynamic>> createEscrowV2({
    required String buyerId,
    required String sellerId,
    required double amount,
    required String description,
  }) async {
    final token = await getToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await http.post(
      Uri.parse('$_baseUrl${ApiRoutes.v2Escrow}'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: json.encode({
        'buyerId': buyerId,
        'sellerId': sellerId,
        'amount': amount,
        'description': description,
      }),
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) return data;
    throw Exception(data['message'] ?? 'Escrow creation failed');
  }

  // ============================================
  // ADMIN v2
  // ============================================

  Future<Map<String, dynamic>> getAdminStatsV2() async {
    final token = await getToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await http.get(
      Uri.parse('$_baseUrl${ApiRoutes.v2AdminStats}'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) return data;
    throw Exception(data['message'] ?? 'Failed to get stats');
  }

  Future<Map<String, dynamic>> getAdminUsersV2() async {
    final token = await getToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await http.get(
      Uri.parse('$_baseUrl${ApiRoutes.v2AdminUsers}'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) return data;
    throw Exception(data['message'] ?? 'Failed to get users');
  }

  // ============================================
  // WEBSOCKET SUPPORT
  // ============================================

  String get wsUrl {
    if (kDebugMode) {
      return ApiRoutes.websocket;
    }
    return ApiRoutes.websocketProd;
  }
}
