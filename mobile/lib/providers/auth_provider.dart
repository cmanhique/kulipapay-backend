import 'package:flutter/foundation.dart';
import '../models/login_result.dart';
import '../services/api_service.dart';
import 'user_provider.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService.instance;

  // =========================
  // STATE
  // =========================
  String? _kpId;
  String? _email;
  String? _phone;
  String? _name;
  String? _countryCode;
  String? _accountType;
  String? _role;

  double _balance = 0.0;

  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;

  // 🔥 NOVO: Estado para 2FA
  bool _requiresTwoFactor = false;
  String? _pendingKpId;

  // =========================
  // GETTERS
  // =========================
  String? get kpId => _kpId;
  String? get email => _email;
  String? get phone => _phone;
  String? get name => _name;
  String? get countryCode => _countryCode;
  String? get accountType => _accountType;
  String? get role => _role;

  double get balance => _balance;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;

  String? get token => _api.token;

  // 🔥 NOVO: Getters para 2FA
  bool get requiresTwoFactor => _requiresTwoFactor;
  String? get pendingKpId => _pendingKpId;

  bool get isAdmin => _role == 'ADMIN';
  bool get isAgent => _accountType == 'AGENT' || _role == 'AGENT';
  bool get isMerchant => _accountType == 'MERCHANT';

  // =========================
  // REGISTER
  // =========================
  Future<bool> register(
    String email,
    String phone,
    String password, {
    String name = '',
    String countryCode = 'MZ',
    String accountType = 'INDIVIDUAL',
    Map<String, dynamic> extraData = const {},
    UserProvider? userProvider,
  }) async {
    try {
      _setLoading(true);
      _error = null;

      debugPrint('📝 REGISTER START - email: $email, phone: $phone, type: $accountType');

      await _api.register(
        email,
        phone,
        password,
        name: name,
        country: countryCode,
        accountType: accountType,
        extraData: extraData,
      );

      final identifier = phone.isNotEmpty ? phone : email;
      await _api.login(identifier, password);

      await loadUserData();

      if (userProvider != null) {
        await userProvider.loadUser();
        debugPrint('✅ UserProvider carregado após registo');
      }

      _isAuthenticated = true;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ REGISTER ERROR: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // =========================
  // LOGIN (COM 2FA)
  // =========================
  Future<LoginResult> login(
    String identifier,
    String password, {
    UserProvider? userProvider,
  }) async {
    try {
      _setLoading(true);
      _error = null;
      _requiresTwoFactor = false;
      _pendingKpId = null;
      _isAuthenticated = false;

      debugPrint('🔑 LOGIN START - identifier: $identifier');

      debugPrint('📡 CHAMANDO _api.loginV2()...');
      final loginResponse = await _api.loginV2(identifier, password);
      debugPrint('📡 _api.loginV2() RESPONSE: $loginResponse');

      if (loginResponse['requiresTwoFactor'] == true) {
        final kpId = loginResponse['kp_id']?.toString();
        _pendingKpId = kpId;
        _requiresTwoFactor = true;
        _isAuthenticated = false;
        debugPrint('🔑 2FA REQUERIDO para: $_pendingKpId');
        notifyListeners();
        return LoginResult(
          success: true,
          requiresTwoFactor: true,
          kpId: kpId,
        );
      }

      if (loginResponse['success'] == true) {
        debugPrint('🔑 TOKEN RECEBIDO: ${loginResponse['token'] != null ? '✅' : '❌'}');

        debugPrint('📡 CHAMANDO loadUserData()...');
        await loadUserData();
        debugPrint('✅ loadUserData OK - accountType: $_accountType');

        if (userProvider != null) {
          debugPrint('📡 CHAMANDO userProvider.loadUser()...');
          await userProvider.loadUser();
          debugPrint('✅ UserProvider carregado após login');
        }

        _isAuthenticated = true;
        debugPrint('✅ LOGIN COMPLETE - _isAuthenticated: $_isAuthenticated');
        notifyListeners();
        return const LoginResult(success: true);
      }

      _error = 'Login falhou';
      return LoginResult.failure(_error);
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ LOGIN ERROR: $e');
      return LoginResult.failure(_error);
    } finally {
      _setLoading(false);
    }
  }

  // =========================
  // VERIFICAR OTP
  // =========================
  Future<bool> verifyOtp(String code, {UserProvider? userProvider}) async {
    try {
      _setLoading(true);
      _error = null;

      final kpId = _pendingKpId ?? _kpId;
      if (kpId == null) {
        _error = 'KP_ID não encontrado';
        return false;
      }

      debugPrint('🔑 VERIFY OTP - kpId: $kpId, code: $code');
      
      final response = await _api.verifyOtpV2(kpId, code);
      debugPrint('📡 verifyOtpV2() RESPONSE: $response');

      if (response['success'] == true || response['token'] != null) {
        debugPrint('✅ OTP VERIFICADO COM SUCESSO');
        
        _requiresTwoFactor = false;
        _pendingKpId = null;

        await loadUserData();

        if (userProvider != null) {
          await userProvider.loadUser();
        }

        _isAuthenticated = true;
        notifyListeners();
        return true;
      }

      _error = 'Código OTP inválido ou expirado';
      return false;
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ VERIFY OTP ERROR: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // =========================
  // INIT
  // =========================
  Future<void> initialize() async {
    try {
      debugPrint('🔄 INIT START');
      await _api.init();
      await loadUserData();

      _isAuthenticated = _kpId != null;
      debugPrint('✅ INIT COMPLETE - isAuthenticated: $_isAuthenticated');
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ INIT ERROR: $e');
      _isAuthenticated = false;
    }
  }

  // =========================
  // USER DATA
  // =========================
  Future<void> loadUserData() async {
    try {
      debugPrint('🔄 loadUserData START');
      final response = await _api.me();
      debugPrint('📦 loadUserData DATA: $response');

      // 🔥 CORREÇÃO: Extrair dados da estrutura correta
      final data = response['data'] as Map?;
      if (data == null) {
        debugPrint('❌ loadUserData: "data" não encontrado na resposta');
        return;
      }

      final account = data['account'] as Map?;
      final wallet = data['wallet'] as Map?;

      if (account != null) {
        _kpId = account['kp_id']?.toString();
        _email = account['email']?.toString();
        _phone = account['phone']?.toString();
        _name = account['name']?.toString();
        _accountType = account['account_type']?.toString();  // ← CORRETO!
        _role = account['role']?.toString() ?? 'USER';
        _countryCode = account['country']?.toString() ?? 'MZ';
      }

      if (wallet != null) {
        _balance = double.tryParse(wallet['balance']?.toString() ?? '0') ?? 0.0;
      }

      debugPrint('✅ loadUserData OK - accountType: $_accountType, name: $_name');
      notifyListeners();
    } catch (e) {
      debugPrint('❌ loadUserData ERROR: $e');
      rethrow;
    }
  }

  // =========================
  // BALANCE
  // =========================
  Future<void> refreshBalance() async {
    try {
      _balance = await _api.balance();
      debugPrint('💰 BALANCE REFRESHED: $_balance');
      notifyListeners();
    } catch (e) {
      debugPrint('❌ BALANCE ERROR: $e');
    }
  }

  // =========================
  // LOGOUT
  // =========================
  Future<void> logout({UserProvider? userProvider}) async {
    try {
      await _api.logout();
      debugPrint('🔓 LOGOUT API OK');
    } catch (_) {}

    _kpId = null;
    _email = null;
    _phone = null;
    _name = null;
    _countryCode = null;
    _accountType = null;
    _role = null;

    _balance = 0.0;
    _isAuthenticated = false;
    _error = null;
    _requiresTwoFactor = false;
    _pendingKpId = null;

    if (userProvider != null) {
      userProvider.clear();
      debugPrint('🔓 UserProvider limpo');
    }

    debugPrint('🔓 LOGOUT COMPLETE');
    notifyListeners();
  }

  // =========================
  // INTERNAL
  // =========================
  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // =========================
  // RESET 2FA STATE
  // =========================
  void resetTwoFactor() {
    _requiresTwoFactor = false;
    _pendingKpId = null;
    notifyListeners();
  }
}