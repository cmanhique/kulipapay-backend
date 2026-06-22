import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../providers/wallet_provider.dart';
import 'home_screen.dart';
import 'admin/admin_dashboard.dart';
import 'dashboard/merchant_dashboard.dart';
import 'agent/agent_dashboard.dart';
import 'cashier/cashier_dashboard.dart';
import 'enterprise/enterprise_dashboard.dart';
import 'login_screen.dart';
import 'auth/otp_screen.dart';

class RoleGate extends StatefulWidget {
  const RoleGate({super.key});

  @override
  State<RoleGate> createState() => _RoleGateState();
}

class _RoleGateState extends State<RoleGate> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    // 🔥 Usar addPostFrameCallback para evitar setState durante build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initialize();
    });
  }

  Future<void> _initialize() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final walletProvider = Provider.of<WalletProvider>(context, listen: false);

    debugPrint('🔄 RoleGate: INICIANDO...');

    // 1. Inicializar auth (verifica token)
    await authProvider.initialize();
    debugPrint('🔄 RoleGate: AuthProvider inicializado');

    if (!mounted) return;

    // 2. 2FA pendente — não carregar perfil como sessão autenticada
    if (authProvider.requiresTwoFactor) {
      debugPrint('🔄 RoleGate: 2FA pendente, aguardando OTP');
      setState(() => _initialized = true);
      return;
    }

    // 3. Se autenticado, carregar dados do usuário ANTES de decidir
    if (authProvider.isAuthenticated) {
      debugPrint('🔄 RoleGate: Usuário autenticado, carregando dados...');
      
      // Carregar UserProvider primeiro
      await userProvider.loadUser();
      debugPrint('🔄 RoleGate: UserProvider carregado: ${userProvider.accountType}');
      
      // Depois carregar WalletProvider
      await walletProvider.loadBalance();
      await walletProvider.loadTransactions();
      debugPrint('🔄 RoleGate: WalletProvider carregado');
    } else {
      debugPrint('🔄 RoleGate: Usuário NÃO autenticado');
    }

    if (!mounted) return;

    // 4. Marcar como inicializado
    debugPrint('🔄 RoleGate: Inicialização completa!');
    setState(() {
      _initialized = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProvider = Provider.of<UserProvider>(context);

    debugPrint('🔍 ROLE GATE - requiresTwoFactor: ${authProvider.requiresTwoFactor}');
    debugPrint('🔍 ROLE GATE - isAuthenticated: ${authProvider.isAuthenticated}');
    debugPrint('🔍 ROLE GATE - accountType: ${userProvider.accountType}');
    debugPrint('🔍 ROLE GATE - isMerchant: ${userProvider.isMerchant}');
    debugPrint('🔍 ROLE GATE - isAgent: ${userProvider.isAgent}');
    debugPrint('🔍 ROLE GATE - isEnterprise: ${userProvider.isEnterprise}');
    debugPrint('🔍 ROLE GATE - role: ${userProvider.role}');

    // 2FA tem prioridade sobre qualquer outro estado (incl. loading e sessão antiga)
    if (authProvider.requiresTwoFactor) {
      debugPrint('🔍 REDIRECTING TO OTP');
      return const OtpScreen();
    }

    if (!_initialized) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('A carregar...'),
            ],
          ),
        ),
      );
    }

    if (!authProvider.isAuthenticated) {
      debugPrint('🔍 REDIRECTING TO LOGIN');
      return const LoginScreen();
    }

    // ADMIN
    if (userProvider.isAdmin) {
      debugPrint('🔍 REDIRECTING TO ADMIN');
      return const AdminDashboardScreen();
    }

    // MERCHANT
    if (userProvider.isMerchant) {
      debugPrint('🔍 REDIRECTING TO MERCHANT');
      return const MerchantDashboard();
    }

    // AGENT
    if (userProvider.isAgent) {
      debugPrint('🔍 REDIRECTING TO AGENT');
      return const AgentDashboard();
    }

    // CASHIER
    if (userProvider.role == 'CASHIER') {
      debugPrint('🔍 REDIRECTING TO CASHIER');
      return const CashierDashboard();
    }

    // ENTERPRISE
    if (userProvider.isEnterprise) {
      debugPrint('🔍 REDIRECTING TO ENTERPRISE');
      return const EnterpriseDashboard();
    }

    // INDIVIDUAL (default)
    debugPrint('🔍 REDIRECTING TO INDIVIDUAL (HomeScreen)');
    return const HomeScreen();
  }
}