import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WalletProvider extends ChangeNotifier {
  final ApiService _api = ApiService.instance;

  List<dynamic> _transactions = [];
  double _balance = 0.0;
  bool _loading = false;

  List<dynamic> get transactions => _transactions;
  double get balance => _balance;
  bool get loading => _loading;
  bool get isLoading => _loading;

  // ================= LOAD BALANCE =================
  Future<void> loadBalance() async {
    try {
      _balance = await _api.balance();
      notifyListeners();
    } catch (e) {
      debugPrint('❌ loadBalance error: $e');
    }
  }

  // ================= LOAD TRANSACTIONS =================
  Future<void> loadTransactions() async {
    try {
      // 🔥 SIMPLES: apenas atribui o que vem
      _transactions = await _api.transactions();
      notifyListeners();
    } catch (e) {
      debugPrint('❌ loadTransactions error: $e');
      // Se falhar, mantém a lista vazia
      _transactions = [];
      notifyListeners();
    }
  }

  // ================= LOAD ALL =================
  Future<void> loadAll() async {
    _loading = true;
    notifyListeners();

    try {
      await Future.wait([
        loadBalance(),
        loadTransactions(),
      ]);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ================= DEPOSIT =================
  Future<bool> deposit(double amount) async {
    try {
      _balance = await _api.deposit(amount);
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('❌ deposit error: $e');
      return false;
    }
  }

  // ================= TRANSFER =================
  Future<bool> transfer(String toAccount, double amount) async {
    try {
      _balance = await _api.transfer(toAccount, amount);
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('❌ transfer error: $e');
      return false;
    }
  }

  // ================= REFRESH =================
  Future<void> refreshBalance() async {
    await loadBalance();
  }
}