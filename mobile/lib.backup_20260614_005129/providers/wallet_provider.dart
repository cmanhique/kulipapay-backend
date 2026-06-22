import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WalletProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  
  double _balance = 0;
  List<dynamic> _transactions = [];
  bool _isLoading = false;

  double get balance => _balance;
  List<dynamic> get transactions => _transactions;
  bool get isLoading => _isLoading;

  Future<void> loadBalance() async {
    try {
      _balance = await _api.getBalance();
      notifyListeners();
    } catch (e) {
      print('Error loading balance: $e');
    }
  }

  Future<void> loadTransactions() async {
    try {
      _transactions = await _api.getTransactions();
      notifyListeners();
    } catch (e) {
      print('Error loading transactions: $e');
    }
  }

  Future<bool> deposit(double amount) async {
    _isLoading = true;
    notifyListeners();
    try {
      _balance = await _api.deposit(amount);
      await loadTransactions();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> transfer(String toKp, double amount) async {
    _isLoading = true;
    notifyListeners();
    try {
      _balance = await _api.transfer(toKp, amount);
      await loadTransactions();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
