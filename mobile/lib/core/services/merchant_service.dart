import '../api/api_client.dart';
import '../models/stats.dart';
import '../models/region.dart';

class MerchantService {
  final ApiClient api;
  final String token;

  MerchantService({required this.api, required this.token});

  Future<MerchantStats> getStats() async {
    final response = await api.get('/merchant/stats', token);
    return MerchantStats.fromJson(response);
  }

  Future<GlobalDashboard> getGlobalDashboard() async {
    final response = await api.get('/api/regions/dashboard/global', token);
    return GlobalDashboard.fromJson(response);
  }

  Future<MerchantStats> getDashboard() async {
    final response = await api.get('/merchant/dashboard', token);
    final data = response['data'] ?? {};
    return MerchantStats(
      totalSales: data['stats']?['totalCredits']?.toDouble() ?? 0,
      totalFees: data['stats']?['totalDebits']?.toDouble() ?? 0,
      netSales: data['balance']?.toDouble() ?? 0,
      salesCount: data['recentSales']?.length ?? 0,
      balance: data['balance']?.toDouble() ?? 0,
    );
  }
}