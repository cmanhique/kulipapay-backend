import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/wallet_provider.dart';
import '../transfer_screen.dart';
import '../deposit_screen.dart';
import '../withdraw_screen.dart';
import '../history_screen.dart';
import '../qrcode_screen.dart';
import '../home_screen.dart';
import '../login_screen.dart';
import 'dashboard_screen.dart';

class UserShell extends StatefulWidget {
  const UserShell({super.key});

  @override
  State<UserShell> createState() => _UserShellState();
}

class _UserShellState extends State<UserShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final walletProvider = Provider.of<WalletProvider>(context);
    
    final isMerchant = authProvider.accountType == 'MERCHANT';
    
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
              if (!isMerchant) {
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
            onPressed: () {
              setState(() {});
            },
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
