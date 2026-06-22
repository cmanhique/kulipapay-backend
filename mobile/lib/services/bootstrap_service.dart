import 'package:flutter/foundation.dart';
import 'api_service.dart';

class BootstrapService {
  static final BootstrapService _instance = BootstrapService._internal();
  factory BootstrapService() => _instance;
  static BootstrapService get instance => _instance;

  Map<String, dynamic>? _cachedData;
  bool _isLoaded = false;

  BootstrapService._internal();

  Future<Map<String, dynamic>> loadBootstrap({bool forceRefresh = false}) async {
    if (_isLoaded && !forceRefresh) {
      return _cachedData!;
    }

    try {
      final data = await ApiService.instance.getBootstrap();
      _cachedData = data['data'] ?? {};
      _isLoaded = true;
      debugPrint('✅ Bootstrap carregado com sucesso');
      return _cachedData!;
    } catch (e) {
      debugPrint('❌ Erro ao carregar bootstrap: $e');
      if (_cachedData != null) {
        return _cachedData!;
      }
      return {};
    }
  }

  String get appName => _cachedData?['app']?['name'] ?? 'KulipaPay';
  String get appVersion => _cachedData?['app']?['version'] ?? '2.0.0';
  String get environment => _cachedData?['app']?['environment'] ?? 'development';

  String get currency => _cachedData?['config']?['currency'] ?? 'MZN';
  List<String> get languages => 
      List<String>.from(_cachedData?['config']?['languages'] ?? ['pt', 'en']);
  String get defaultLanguage => 
      _cachedData?['config']?['defaultLanguage'] ?? 'pt';

  List<String> get availableModules => 
      List<String>.from(_cachedData?['modules']?['available'] ?? []);
  List<String> get requiresAuthModules => 
      List<String>.from(_cachedData?['modules']?['requiresAuth'] ?? []);

  double get maxTransfer => 
      (_cachedData?['limits']?['maxTransferAmount'] ?? 100000).toDouble();
  double get minTransfer => 
      (_cachedData?['limits']?['minTransferAmount'] ?? 1).toDouble();
  double get dailyLimit => 
      (_cachedData?['limits']?['dailyTransferLimit'] ?? 500000).toDouble();

  double get transferFee => 
      (_cachedData?['fees']?['transfer'] ?? 0.02).toDouble();
  double get withdrawalFee => 
      (_cachedData?['fees']?['withdrawal'] ?? 0.01).toDouble();

  bool get requiresTwoFactor => 
      _cachedData?['auth']?['requiresTwoFactor'] ?? true;
  int get sessionTimeout => 
      _cachedData?['auth']?['sessionTimeout'] ?? 3600;

  Map<String, String> get endpoints {
    final endpoints = _cachedData?['endpoints'] ?? {};
    return {
      'login': endpoints['login'] ?? '/api/auth/login',
      'register': endpoints['register'] ?? '/api/auth/register',
      'wallet': endpoints['wallet'] ?? '/api/wallet',
      'transfer': endpoints['transfer'] ?? '/api/transaction',
      'payment': endpoints['payment'] ?? '/api/payment',
    };
  }

  bool isFeatureEnabled(String feature) {
    final features = _cachedData?['features'] ?? {};
    return features[feature] ?? false;
  }

  void clearCache() {
    _cachedData = null;
    _isLoaded = false;
  }
}
