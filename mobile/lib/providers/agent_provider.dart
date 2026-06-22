import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AgentProvider extends ChangeNotifier {
  final ApiService _api = ApiService.instance;

  double _floatBalance = 0.0;
  double _cashBalance = 0.0;
  double _commissionBalance = 0.0;
  int _todayTransactions = 0;
  double _todayCashIn = 0.0;
  double _todayCashOut = 0.0;
  double _todayProfit = 0.0;
  bool _loading = false;
  bool _processing = false;

  double get floatBalance => _floatBalance;
  double get cashBalance => _cashBalance;
  double get commissionBalance => _commissionBalance;
  int get todayTransactions => _todayTransactions;
  double get todayCashIn => _todayCashIn;
  double get todayCashOut => _todayCashOut;
  double get todayProfit => _todayProfit;
  bool get loading => _loading;
  bool get processing => _processing;

  Future<void> loadDashboard(String agentKpId) async {
    _loading = true;
    notifyListeners();

    try {
      final res = await _api.getAgentStats(agentKpId);
      final data = res['data'] ?? {};
      final today = data['today'] ?? {};

      _floatBalance = (data['floatBalance'] ?? 0).toDouble();
      _cashBalance = (data['cashBalance'] ?? 0).toDouble();
      _commissionBalance = (data['commissionBalance'] ?? 0).toDouble();
      _todayTransactions = today['transactions'] ?? 0;
      _todayCashIn = (today['cashInTotal'] ?? 0).toDouble();
      _todayCashOut = (today['cashOutTotal'] ?? 0).toDouble();
      _todayProfit = (today['commission'] ?? 0).toDouble();
    } catch (e) {
      debugPrint('Erro ao carregar dashboard: $e');
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> doCashIn({
    required String agentKpId,
    required String customerKpId,
    required double amount,
    required String agentPin,
  }) async {
    if (amount <= 0) {
      throw Exception('Valor inválido');
    }

    _processing = true;
    notifyListeners();

    try {
      await _api.cashInAgent(
        agentKpId: agentKpId,
        customerKpId: customerKpId,
        amount: amount,
        agentPin: agentPin,
      );
      await loadDashboard(agentKpId);
    } finally {
      _processing = false;
      notifyListeners();
    }
  }

  Future<void> doCashOut({
    required String agentKpId,
    required String customerKpId,
    required double amount,
    required String agentPin,
  }) async {
    if (amount <= 0) {
      throw Exception('Valor inválido');
    }

    _processing = true;
    notifyListeners();

    try {
      await _api.cashOutAgent(
        agentKpId: agentKpId,
        customerKpId: customerKpId,
        amount: amount,
        agentPin: agentPin,
      );
      await loadDashboard(agentKpId);
    } finally {
      _processing = false;
      notifyListeners();
    }
  }

  void reset() {
    _floatBalance = 0;
    _cashBalance = 0;
    _commissionBalance = 0;
    _todayTransactions = 0;
    _todayCashIn = 0;
    _todayCashOut = 0;
    _todayProfit = 0;
    notifyListeners();
  }
}
