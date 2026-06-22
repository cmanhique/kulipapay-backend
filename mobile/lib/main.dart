import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'services/api_service.dart';
import 'providers/auth_provider.dart';
import 'providers/user_provider.dart';
import 'providers/wallet_provider.dart';
import 'providers/merchant_provider.dart';

import 'screens/role_gate.dart';
import 'screens/login_screen.dart';
import 'screens/cashier/cashier_login_screen.dart';
import 'screens/dashboard/merchant_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.instance.init();
  runApp(const KulipaPayApp());
}

class KulipaPayApp extends StatelessWidget {
  const KulipaPayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
        ChangeNotifierProvider(create: (_) => MerchantProvider()),
      ],
      child: MaterialApp(
        title: 'KulipaPay',
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: GoogleFonts.poppins().fontFamily,
        ),
        home: const RoleGate(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/dashboard': (_) => const MerchantDashboard(),
          '/cashier-login': (context) {
            final args =
                ModalRoute.of(context)?.settings.arguments as String?;
            return CashierLoginScreen(inviteCode: args ?? '');
          },
        },
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}