import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../utils/format_utils.dart';
import 'transfer_screen.dart';
import 'deposit_screen.dart';
import 'withdraw_screen.dart';
import 'history_screen.dart';
import 'qrcode_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    
    await authProvider.loadUserData();
    await walletProvider.loadBalance();
    await walletProvider.loadTransactions();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final walletProvider = Provider.of<WalletProvider>(context);

    if (authProvider.kpId == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isMerchant = authProvider.accountType == 'MERCHANT';
    final isIndividual = authProvider.accountType == 'INDIVIDUAL';

    List<Widget> screens;
    List<NavigationDestination> destinations;
    
    if (isMerchant) {
      screens = [
        DashboardScreen(
          kpId: authProvider.kpId!,
          email: authProvider.email ?? '',
          name: authProvider.name ?? '',
          balance: walletProvider.balance,
          isLoading: walletProvider.isLoading,
          countryCode: authProvider.countryCode ?? 'MZ',
          isMerchant: true,
        ),
        const DepositScreen(),
        const TransferScreen(),
        const HistoryScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.home), label: 'Início'),
        NavigationDestination(icon: Icon(Icons.download), label: 'Depósito'),
        NavigationDestination(icon: Icon(Icons.send), label: 'Transferir'),
        NavigationDestination(icon: Icon(Icons.history), label: 'Histórico'),
      ];
    } else {
      screens = [
        DashboardScreen(
          kpId: authProvider.kpId!,
          email: authProvider.email ?? '',
          name: authProvider.name ?? '',
          balance: walletProvider.balance,
          isLoading: walletProvider.isLoading,
          countryCode: authProvider.countryCode ?? 'MZ',
          isMerchant: false,
        ),
        const WithdrawScreen(),
        const TransferScreen(),
        const HistoryScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.home), label: 'Início'),
        NavigationDestination(icon: Icon(Icons.upload), label: 'Levantar'),
        NavigationDestination(icon: Icon(Icons.send), label: 'Transferir'),
        NavigationDestination(icon: Icon(Icons.history), label: 'Histórico'),
      ];
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('KulipaPay'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code),
            onPressed: () {
              if (isIndividual) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ScanQRCodeScreen()),
                );
              } else {
                showModalBottomSheet(
                  context: context,
                  builder: (context) => Container(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ListTile(
                          leading: const Icon(Icons.qr_code, color: Colors.blue),
                          title: const Text('Gerar QR Code (receber)'),
                          onTap: () {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const GenerateQRCodeScreen()),
                            );
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.qr_code_scanner, color: Colors.green),
                          title: const Text('Escanear QR Code (pagar)'),
                          onTap: () {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ScanQRCodeScreen()),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await authProvider.logout();
              if (context.mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: destinations,
      ),
    );
  }
}

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
