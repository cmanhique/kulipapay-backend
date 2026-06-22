import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class ApiService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _cachedToken;

  Future<Map<String, String>> _getHeaders() async {
    final token = _cachedToken ?? await _storage.read(key: 'auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ============ AUTH ============
  Future<Map<String, dynamic>> register(String email, String phone, String password, {String name = '', String country = 'MZ'}) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'phone': phone,
        'password': password,
        'name': name,
        'country': country
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final token = data['accessToken'] ?? data['token'];
      await _storage.write(key: 'auth_token', value: token);
      _cachedToken = token;
      return data;
    } else {
      throw Exception('Registration failed');
    }
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'identifier': identifier, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final token = data['accessToken'] ?? data['token'];
      await _storage.write(key: 'auth_token', value: token);
      _cachedToken = token;
      return data;
    } else {
      throw Exception('Login failed');
    }
  }

  Future<Map<String, dynamic>> getUserData() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConfig.apiUrl}/api/auth/me'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to get user data');
    }
  }

  Future<void> logout() async {
    final headers = await _getHeaders();
    await http.post(Uri.parse('${AppConfig.apiUrl}/api/auth/logout'), headers: headers);
    await _storage.deleteAll();
    _cachedToken = null;
  }

  // ============ WALLET ============
  Future<double> getBalance() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConfig.apiUrl}/api/wallet/balance'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['balance'] ?? 0).toDouble();
    } else {
      throw Exception('Failed to get balance');
    }
  }

  Future<List<dynamic>> getTransactions() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConfig.apiUrl}/api/wallet/transactions'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['transactions'] ?? [];
    } else {
      throw Exception('Failed to get transactions');
    }
  }

  Future<double> deposit(double amount) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/wallet/deposit'),
      headers: headers,
      body: json.encode({'amount': amount}),
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['balance'] ?? 0).toDouble();
    } else {
      throw Exception('Deposit failed');
    }
  }

  Future<double> transfer(String toAccount, double amount) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/wallet/transfer'),
      headers: headers,
      body: json.encode({'toAccount': toAccount, 'amount': amount}),
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['fromBalance'] ?? 0).toDouble();
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Transfer failed');
    }
  }

  // ============ QR CODE ============
  Future<Map<String, dynamic>> generateQRCode(double amount, String description) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/qr/generate'),
      headers: headers,
      body: json.encode({'amount': amount, 'description': description}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to generate QR Code');
    }
  }

  Future<Map<String, dynamic>> payWithQRCode(String qrCode) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/qr/pay'),
      headers: headers,
      body: json.encode({'qrCode': qrCode}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Payment failed');
    }
  }

  // ============ PIN ============
  Future<void> setPin(String pin) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/security/pin/set'),
      headers: headers,
      body: json.encode({'pin': pin}),
    );
    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to set PIN');
    }
  }

  Future<void> verifyPin(String pin) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/security/pin/verify'),
      headers: headers,
      body: json.encode({'pin': pin}),
    );
    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Invalid PIN');
    }
  }

  Future<bool> hasPin() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConfig.apiUrl}/api/security/pin/status'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['hasPin'] ?? false;
    }
    return false;
  }

  // ============ ADMIN ============
  Future<Map<String, dynamic>> getAdminStats() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${AppConfig.apiUrl}/api/admin/stats'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to get admin stats');
    }
  }

  // ============ PASSWORD RECOVERY ============
  Future<Map<String, dynamic>> requestPasswordReset(String identifier) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'identifier': identifier}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to request password reset');
    }
  }

  Future<Map<String, dynamic>> resetPassword(String token, String newPassword) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/api/auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'token': token, 'newPassword': newPassword}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to reset password');
    }
  }
}
