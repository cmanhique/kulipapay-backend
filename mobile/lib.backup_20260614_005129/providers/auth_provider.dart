import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  String? _kpId;
  String? _email;
  String? _phone;
  String? _name;
  double? _balance;
  String? _countryCode;
  String? _accountType;
  String? _role;

  bool _isLoading = false;
  bool _isAuthenticated = false;

  String? get kpId => _kpId;
  String? get email => _email;
  String? get phone => _phone;
  String? get name => _name;
  double? get balance => _balance;
  String? get countryCode => _countryCode;
  String? get accountType => _accountType;
  String? get role => _role;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  Future<bool> register(String email, String phone, String password, {String name = '', String countryCode = 'MZ'}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await _api.register(email, phone, password, name: name, country: countryCode);
      _kpId = data['kpId'];
      _email = email;
      _phone = phone;
      _name = name;
      _countryCode = countryCode;
      _accountType = 'INDIVIDUAL';
      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      await loadUserData();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await _api.login(identifier, password);
      _kpId = data['kpId'];
      _email = identifier.contains('@') ? identifier : null;
      _name = data['name'];
      _role = data['role'] ?? 'INDIVIDUAL';
      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      await loadUserData();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loadUserData() async {
    try {
      final data = await _api.getUserData();
      _kpId = data['kp_id'];
      _email = data['email'];
      _phone = data['phone'];
      _name = data['name'];
      _balance = (data['wallet']?['balance'] ?? 0).toDouble();
      _countryCode = data['country'] ?? 'MZ';
      _accountType = data['account_type'] ?? 'INDIVIDUAL';
      _role = data['role'] ?? _role ?? 'INDIVIDUAL';
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading user data: $e');
    }
  }

  Future<void> logout() async {
    await _api.logout();
    _kpId = null;
    _email = null;
    _phone = null;
    _name = null;
    _balance = null;
    _countryCode = null;
    _accountType = null;
    _role = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
