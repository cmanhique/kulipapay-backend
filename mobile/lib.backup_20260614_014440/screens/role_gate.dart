import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'admin/admin_dashboard.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class RoleGate extends StatelessWidget {
  const RoleGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    if (!authProvider.isAuthenticated) {
      return const LoginScreen();
    }
    
    if (authProvider.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    
    // Verificar se é admin
    if (authProvider.role == 'ADMIN') {
      return const AdminDashboardScreen();
    }
    
    // Utilizadores normais
    return const HomeScreen();
  }
}
