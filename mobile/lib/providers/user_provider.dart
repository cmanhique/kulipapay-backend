import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class UserProvider extends ChangeNotifier {
  final ApiService _api = ApiService.instance;

  String? _kpId;
  String? _name;
  String? _email;
  String? _phone;
  String? _role;
  String? _accountType;
  String? _country;

  bool _isAgent = false;
  String? _agentCode;
  String? _businessType;
  String? _businessName;
  double? _feeRate;
  double? _floatBalance;
  double? _commission;

  // =========================
  // GETTERS
  // =========================
  String? get kpId => _kpId;
  String? get name => _name;
  String? get email => _email;
  String? get phone => _phone;
  String? get role => _role;
  String? get accountType => _accountType;
  String? get country => _country;

  bool get isAgent => _isAgent;
  String? get agentCode => _agentCode;
  String? get businessType => _businessType;
  String? get businessName => _businessName;
  double? get feeRate => _feeRate;
  double? get floatBalance => _floatBalance;
  double? get commission => _commission;

  bool get isAdmin => _role == 'ADMIN';
  bool get isMerchant => _accountType == 'MERCHANT';
  bool get isIndividual => _accountType == 'INDIVIDUAL';
  bool get isEnterprise => _accountType == 'ENTERPRISE';

  // =========================
  // LOAD USER
  // =========================
  Future<void> loadUser() async {
    try {
      debugPrint('🔄 UserProvider.loadUser() START');

      final response = await _api.me();
      debugPrint('📦 UserProvider DATA: $response');

      // 🔥 CORREÇÃO: Extrair dados da estrutura correta
      final data = response['data'] as Map?;
      if (data == null) {
        debugPrint('❌ loadUser: "data" não encontrado na resposta');
        return;
      }

      final account = data['account'] as Map?;
      
      // 🔥 LOGS ADICIONADOS
      debugPrint('📦 ACCOUNT DATA no UserProvider: $account');
      debugPrint('📦 account_type do backend no UserProvider: ${account?['account_type']}');

      if (account != null) {
        _kpId = account['kp_id']?.toString();
        _name = account['name']?.toString();
        _email = account['email']?.toString();
        _phone = account['phone']?.toString();
        _role = account['role']?.toString() ?? 'USER';
        _accountType = account['account_type']?.toString();
        debugPrint('📦 _accountType no UserProvider definido como: $_accountType');
        _country = account['country']?.toString() ?? 'MZ';
      } else {
        debugPrint('❌ account é null no UserProvider!');
      }

      // Verificar se é agente
      _isAgent = _role == 'AGENT' || _accountType == 'AGENT';
      
      // Extrair dados do merchant se disponível
      final merchant = data['merchant'] ?? data['merchantProfile'];
      if (merchant is Map) {
        _businessName = merchant['businessName']?.toString() ??
            merchant['business_name']?.toString();
        _feeRate = (merchant['feeRate'] ?? merchant['fee_rate'] ?? 0).toDouble();
      }

      // Extrair dados do agente se disponível
      final agent = data['agent'] ?? data['agentProfile'];
      if (agent is Map) {
        _floatBalance = (agent['floatBalance'] ?? agent['float_balance'] ?? 0).toDouble();
        _commission = (agent['commission'] ?? 0).toDouble();
      }

      debugPrint('✅ USER LOADED: $_name | $_accountType | agent=$_isAgent');
      debugPrint('✅ isMerchant: ${_accountType == 'MERCHANT'}');
      debugPrint('✅ isAgent: ${_accountType == 'AGENT'}');
      debugPrint('✅ isEnterprise: ${_accountType == 'ENTERPRISE'}');
      notifyListeners();
    } catch (e) {
      debugPrint('❌ USER LOAD ERROR: $e');
      rethrow;
    }
  }

  // =========================
  // CLEAR
  // =========================
  void clear() {
    debugPrint('🔄 UserProvider.clear() START');

    _kpId = null;
    _name = null;
    _email = null;
    _phone = null;
    _role = null;
    _accountType = null;
    _country = null;

    _isAgent = false;
    _agentCode = null;
    _businessType = null;
    _businessName = null;
    _feeRate = null;
    _floatBalance = null;
    _commission = null;

    debugPrint('✅ UserProvider.clear() COMPLETE');
    notifyListeners();
  }
}