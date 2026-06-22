import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/merchant_provider.dart';

class RegionsScreen extends StatelessWidget {
  const RegionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<MerchantProvider>(context);
    final global = provider.globalDashboard;

    // Extrair regiões do mapa
    final regions = global?['byRegion'] as List? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Regiões'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.loadGlobalDashboard(),
          ),
        ],
      ),
      body: provider.loading
          ? const Center(child: CircularProgressIndicator())
          : regions.isEmpty
              ? const Center(
                  child: Text(
                    'Nenhuma região encontrada',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: regions.length,
                  itemBuilder: (context, index) {
                    final region = regions[index];
                    return _buildRegionCard(context, region);
                  },
                ),
    );
  }

  Widget _buildRegionCard(BuildContext context, dynamic region) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.blue[100],
          child: Text(
            region['regionCode'] ?? '?',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(region['regionName'] ?? 'Região'),
        subtitle: Text('${region['count'] ?? 0} transações'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'MT ${(region['totalNet'] ?? 0).toStringAsFixed(2)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            Text(
              'Taxas: MT ${(region['totalFees'] ?? 0).toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}