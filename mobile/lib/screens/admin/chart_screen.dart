import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class AdminChartScreen extends StatefulWidget {
  const AdminChartScreen({super.key});

  @override
  State<AdminChartScreen> createState() => _AdminChartScreenState();
}

class _AdminChartScreenState extends State<AdminChartScreen> {
  List<dynamic> chartData = [];
  bool isLoading = true;
  final ApiService _api = ApiService.instance;

  @override
  void initState() {
    super.initState();
    _loadChartData();
  }

  Future<void> _loadChartData() async {
    setState(() => isLoading = true);
    try {
      final response = await _api.getChartData();
      setState(() {
        chartData = response['chartData'] ?? [];
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Estatísticas')),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : chartData.isEmpty
              ? const Center(child: Text('Sem dados'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    const Text(
                      'Transações (últimos 7 dias)',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    ...chartData.map((item) {
                      final date = item['date']?.toString().substring(0, 10) ?? '';
                      final count = item['count'] ?? 0;
                      final total = (item['total'] ?? 0).toDouble();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(date),
                          subtitle: Text('$count transações'),
                          trailing: Text('${total.toStringAsFixed(2)} MT'),
                        ),
                      );
                    }),
                  ],
                ),
    );
  }
}
