import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/merchant_provider.dart';
import '../../services/cashier_service.dart';
import '../../core/models/cashier.dart';
import '../cashier/widgets/cashier_qr_card.dart';

class CashiersScreen extends StatefulWidget {
  const CashiersScreen({super.key});

  @override
  State<CashiersScreen> createState() => _CashiersScreenState();
}

class _CashiersScreenState extends State<CashiersScreen> {
  final CashierService _cashierService = CashierService();
  List<Cashier> _cashiers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCashiers();
  }

  Future<void> _loadCashiers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = await _getToken();
      debugPrint('🔑 Token para listar caixas: ${token != null ? "✅ SIM" : "❌ NÃO"}');
      final cashiers = await _cashierService.getCashiers(token);
      setState(() {
        _cashiers = cashiers;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<String> _getToken() async {
    final merchantProvider = Provider.of<MerchantProvider>(context, listen: false);
    final token = merchantProvider.token;
    if (token == null || token.isEmpty) {
      throw Exception('Token não disponível - faça login novamente');
    }
    return token;
  }

  Future<void> _createCashier() async {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Criar Caixa'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Nome *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(
                labelText: 'Telefone',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue[700],
              foregroundColor: Colors.white,
            ),
            child: const Text('Criar'),
          ),
        ],
      ),
    );

    if (result == true) {
      try {
        final token = await _getToken();
        debugPrint('🔑 Token para criar caixa: ${token != null ? "✅ SIM" : "❌ NÃO"}');
        await _cashierService.createCashier(
          token,
          nameController.text.trim(),
          emailController.text.trim(),
          phoneController.text.trim(),
        );
        await _loadCashiers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Caixa criado com sucesso!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro: $e')),
          );
        }
      }
    }
  }

  Future<void> _activateCashier(String id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ativar Caixa'),
        content: Text('Tem certeza que deseja ativar o caixa "$name"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('Ativar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final token = await _getToken();
        await _cashierService.activateCashier(token, id);
        await _loadCashiers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Caixa ativado com sucesso!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao ativar: $e')),
          );
        }
      }
    }
  }

  // 🔥 BLOQUEAR CAIXA
  Future<void> _blockCashier(String id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bloquear Caixa'),
        content: Text('Tem certeza que deseja bloquear o caixa "$name"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
            child: const Text('Bloquear'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final token = await _getToken();
        await _cashierService.blockCashier(token, id);
        await _loadCashiers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Caixa bloqueado com sucesso!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao bloquear: $e')),
          );
        }
      }
    }
  }

  Future<void> _deleteCashier(String id, String name) async {
    final cashier = _cashiers.firstWhere((c) => c.id == id);
    if (cashier.paymentCount > 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não é possível apagar caixa com transações'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apagar Caixa'),
        content: Text('Tem certeza que deseja apagar o caixa "$name"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Apagar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final token = await _getToken();
        await _cashierService.deleteCashier(token, id);
        await _loadCashiers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Caixa apagado com sucesso!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao apagar: $e')),
          );
        }
      }
    }
  }

  void _showQrDialog(Cashier cashier) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: CashierQrCard(
            inviteCode: cashier.inviteCode,
            merchantName: cashier.name,
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'BLOCKED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Ativo';
      case 'PENDING':
        return 'Pendente';
      case 'BLOCKED':
        return 'Bloqueado';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Caixas'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadCashiers,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _createCashier,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 8),
                      Text(_error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadCashiers,
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : _cashiers.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person_off, size: 48, color: Colors.grey),
                          SizedBox(height: 8),
                          Text('Nenhum caixa encontrado'),
                          SizedBox(height: 4),
                          Text(
                            'Clique no + para criar um caixa',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _cashiers.length,
                      itemBuilder: (context, index) {
                        final cashier = _cashiers[index];
                        final isActive = cashier.status.toUpperCase() == 'ACTIVE';
                        final isPending = cashier.status.toUpperCase() == 'PENDING';
                        final isBlocked = cashier.status.toUpperCase() == 'BLOCKED';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: _getStatusColor(cashier.status),
                              child: Text(
                                cashier.name[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Text(
                              cashier.name,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (cashier.email != null)
                                  Text(
                                    cashier.email!,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                Text(
                                  'Código: ${cashier.inviteCode}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                                if (cashier.paymentCount > 0)
                                  Text(
                                    '${cashier.paymentCount} transações',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Colors.blue,
                                    ),
                                  ),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // 🔥 BOTÃO QR CODE
                                IconButton(
                                  icon: const Icon(Icons.qr_code, color: Colors.blue),
                                  onPressed: () {
                                    _showQrDialog(cashier);
                                  },
                                  tooltip: 'Ver QR Code',
                                ),
                                // 🔥 BOTÃO ATIVAR (se PENDING)
                                if (isPending)
                                  IconButton(
                                    icon: const Icon(
                                      Icons.check_circle,
                                      color: Colors.green,
                                    ),
                                    onPressed: () => _activateCashier(
                                      cashier.id,
                                      cashier.name,
                                    ),
                                    tooltip: 'Ativar caixa',
                                  ),
                                // 🔥 BOTÃO BLOQUEAR (se ACTIVE)
                                if (isActive)
                                  IconButton(
                                    icon: const Icon(
                                      Icons.block,
                                      color: Colors.orange,
                                    ),
                                    onPressed: () => _blockCashier(
                                      cashier.id,
                                      cashier.name,
                                    ),
                                    tooltip: 'Bloquear caixa',
                                  ),
                                // 🔥 BOTÃO DESBLOQUEAR (se BLOCKED)
                                if (isBlocked)
                                  IconButton(
                                    icon: const Icon(
                                      Icons.check_circle,
                                      color: Colors.green,
                                    ),
                                    onPressed: () => _activateCashier(
                                      cashier.id,
                                      cashier.name,
                                    ),
                                    tooltip: 'Desbloquear caixa',
                                  ),
                                // 🔥 BOTÃO APAGAR (se sem transações)
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete,
                                    color: Colors.red,
                                  ),
                                  onPressed: cashier.paymentCount > 0
                                      ? null
                                      : () => _deleteCashier(
                                          cashier.id,
                                          cashier.name,
                                        ),
                                  tooltip: cashier.paymentCount > 0
                                      ? 'Não pode apagar caixa com transações'
                                      : 'Apagar caixa',
                                ),
                              ],
                            ),
                            onTap: () {
                              // TODO: Implementar detalhes do caixa
                            },
                          ),
                        );
                      },
                    ),
    );
  }
}