import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MerchantProvider extends ChangeNotifier {
  final ApiService _api = ApiService.instance;

  bool _loading = false;
  Map<String, dynamic>? _dashboard;
  Map<String, dynamic>? _stats;
  List<dynamic>? _regions;
  Map<String, dynamic>? _global;

  bool get loading => _loading;
  Map<String, dynamic>? get dashboard => _dashboard;
  Map<String, dynamic>? get stats => _stats;
  List<dynamic>? get regions => _regions;
  Map<String, dynamic>? get globalDashboard => _global;

  // 🔥 GETTER PARA O TOKEN
  String? get token => _api.token;

  Future<void> loadDashboard() async {
    _loading = true;
    notifyListeners();

    try {
      final res = await _api.merchantDashboard();
      if (res['success'] == true) {
        _dashboard = res['data'];
      }
    } catch (e) {
      debugPrint('Dashboard error: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadStats() async {
    try {
      final res = await _api.merchantStats();
      if (res['success'] == true) {
        final data = res['data'] ?? {};
        final totalSales = data['totalSales'] ?? 0;
        final totalFees = data['totalFees'] ?? 0;
        _stats = {
          ...data,
          'totalNet': totalSales - totalFees,
          'daily': data['daily'] ?? [],
        };
      }
    } catch (e) {
      debugPrint('Stats error: $e');
    }
    notifyListeners();
  }

  Future<void> loadRegions() async {
    try {
      final res = await _api.regions();
      if (res['success'] == true) {
        _regions = res['data'];
      }
    } catch (e) {
      debugPrint('Regions error: $e');
    }
    notifyListeners();
  }

  Future<void> loadGlobalDashboard() async {
    try {
      final res = await _api.globalDashboard();
      if (res['success'] == true) {
        _global = res['data'];
      }
    } catch (e) {
      debugPrint('Global dashboard error: $e');
    }
    notifyListeners();
  }

  Future<void> refresh() async {
    await loadDashboard();
    await loadStats();
    await loadRegions();
    await loadGlobalDashboard();
  }
}