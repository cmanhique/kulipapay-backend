import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../services/api_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  Map<String, dynamic>? stats;
  bool isLoading = true;
  // 🔥 CORRIGIDO: Usar singleton
  final ApiService _api = ApiService.instance;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => isLoading = true);
    try {
      final response = await _api.getAdminStats();
      setState(() {
        stats = response;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      print('Error loading stats: $e');
    }
  }

  // Função segura para converter para double (nível fintech)
  double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  // Formatação segura (evita NaN, infinite, null)
  String _formatBalance(dynamic value) {
    final balance = _toDouble(value);
    if (!balance.isFinite || balance.isNaN) return '0.00 MT';
    return '${balance.toStringAsFixed(2)} MT';
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final statsData = stats?['stats'] ?? {};

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStats,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              final authProvider = Provider.of<AuthProvider>(context, listen: false);
              final userProvider = Provider.of<UserProvider>(context, listen: false);
              authProvider.logout(userProvider: userProvider);
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.count(
          crossAxisCount: 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          children: [
            _buildStatCard('Utilizadores', statsData['totalUsers'] ?? 0, Icons.people, Colors.blue),
            _buildStatCard('Carteiras', statsData['totalWallets'] ?? 0, Icons.wallet, Colors.green),
            _buildStatCard('Saldo Total', _formatBalance(statsData['totalBalance']), Icons.money, Colors.purple),
            _buildStatCard('Transações', statsData['totalLedgerEntries'] ?? 0, Icons.receipt, Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, dynamic value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 12),
            Text(
              value.toString(),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}