import 'package:flutter/material.dart';
import '../../utils/format_utils.dart';
import '../deposit_screen.dart';
import '../transfer_screen.dart';
import '../withdraw_screen.dart';

class DashboardScreen extends StatelessWidget {
  final String kpId;
  final String email;
  final String name;
  final double balance;
  final bool isLoading;
  final String countryCode;
  final bool isMerchant;

  const DashboardScreen({
    super.key,
    required this.kpId,
    required this.email,
    required this.name,
    required this.balance,
    required this.isLoading,
    required this.countryCode,
    required this.isMerchant,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Colors.blue, Colors.blueAccent]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text('Saldo Disponível', style: TextStyle(color: Colors.white, fontSize: 16)),
                const SizedBox(height: 8),
                if (isLoading)
                  const CircularProgressIndicator(color: Colors.white)
                else
                  Text(
                    FormatUtils.formatMoney(balance, countryCode: countryCode),
                    style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.account_circle),
              title: Text(name.isNotEmpty ? name : 'Utilizador'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('ID: $kpId'),
                  Text(email),
                  Text('Tipo: ${isMerchant ? "Comerciante" : "Individual"}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Ações Rápidas',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (isMerchant)
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    context,
                    Icons.download,
                    'Depósito',
                    Colors.blue,
                    const DepositScreen(),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildActionCard(
                    context,
                    Icons.send,
                    'Transferir',
                    Colors.green,
                    const TransferScreen(),
                  ),
                ),
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    context,
                    Icons.upload,
                    'Levantar',
                    Colors.orange,
                    const WithdrawScreen(),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildActionCard(
                    context,
                    Icons.send,
                    'Transferir',
                    Colors.green,
                    const TransferScreen(),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildActionCard(BuildContext context, IconData icon, String label, Color color, Widget screen) {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => screen)),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
