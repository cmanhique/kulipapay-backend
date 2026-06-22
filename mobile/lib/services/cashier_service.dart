import '../core/api/api_client.dart';
import '../core/models/cashier.dart';

class CashierService {
  final ApiClient _api = ApiClient(baseUrl: 'http://localhost:3000');

  Future<List<Cashier>> getCashiers(String token) async {
    try {
      final response = await _api.get('/cashier/list', token);
      final data = response['data'] as List? ?? [];
      return data.map((json) => Cashier.fromJson(json)).toList();
    } catch (e) {
      print('Erro ao carregar caixas: $e');
      return [];
    }
  }

  Future<Cashier> createCashier(
    String token,
    String name,
    String email,
    String phone,
  ) async {
    final response = await _api.post(
      '/cashier/create',
      {
        'name': name,
        'email': email,
        'phone': phone,
      },
      token,
    );
    return Cashier.fromJson(response['data']);
  }

  Future<Cashier> activateCashier(String token, String id) async {
    final response = await _api.patch(
      '/cashier/$id/activate',
      {},
      token,
    );
    return Cashier.fromJson(response['data']);
  }

  Future<Cashier> blockCashier(String token, String id) async {
    final response = await _api.patch(
      '/cashier/$id/block',
      {},
      token,
    );
    return Cashier.fromJson(response['data']);
  }

  Future<void> deleteCashier(String token, String id) async {
    await _api.delete('/cashier/$id', token);
  }
}