import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../services/api_service.dart';

class CashierDashboard extends StatefulWidget {
  const CashierDashboard({super.key});

  @override
  State<CashierDashboard> createState() => _CashierDashboardState();
}

class _CashierDashboardState extends State<CashierDashboard> {
  bool _isLoading = false;
  String? _cashierStatus;
  String? _cashierName;
  double _todayTotal = 0.0;
  int _todayCount = 0;
  List<dynamic> _recentPayments = [];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);

    try {
      final api = ApiService.instance;
      final token = api.token;

      if (token == null) {
        throw Exception('Token não disponível');
      }

      // 🔥 BUSCAR DADOS DO CAIXA VIA ROTA /dashboard
      final response = await api.get('/cashier/dashboard');
      debugPrint('📊 Dashboard response: $response');

      if (response['success'] == true) {
        final data = response['data'] ?? {};
        final cashierData = data['cashier'] ?? {};
        final todayData = data['today'] ?? {};

        _cashierName = cashierData['name'] ?? 'Caixa';
        _cashierStatus = cashierData['status']?.toString()?.toUpperCase() ?? 'PENDING';
        _todayTotal = (todayData['total'] ?? 0).toDouble();
        _todayCount = todayData['count'] ?? 0;
        _recentPayments = todayData['payments'] ?? [];
      } else {
        throw Exception('Erro ao carregar dashboard');
      }

      debugPrint('📊 Status do caixa: $_cashierStatus');
      debugPrint('📊 isActive: $_isActive');
      debugPrint('📊 isPending: $_isPending');
      debugPrint('📊 isBlocked: $_isBlocked');

    } catch (e) {
      debugPrint('❌ Erro ao carregar dashboard: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  bool get _isActive => _cashierStatus == 'ACTIVE';
  bool get _isPending => _cashierStatus == 'PENDING';
  bool get _isBlocked => _cashierStatus == 'BLOCKED';

  Color get _statusColor {
    if (_isActive) return Colors.green;
    if (_isPending) return Colors.orange;
    if (_isBlocked) return Colors.red;
    return Colors.grey;
  }

  String get _statusText {
    if (_isActive) return '🟢 Online';
    if (_isPending) return '🟡 Pendente';
    if (_isBlocked) return '🔴 Bloqueado';
    return '⚪ Offline';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard do Caixa'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboard,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final auth = context.read<AuthProvider>();
              await auth.logout(userProvider: context.read<UserProvider>());
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 🔥 STATUS DO CAIXA
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _statusColor, width: 2),
                  ),
                  child: Row(
                    children: [
                      Icon(_isActive ? Icons.check_circle : Icons.block,
                          color: _statusColor, size: 40),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Status: $_statusText',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _statusColor,
                              ),
                            ),
                            Text(
                              _isActive
                                  ? 'Pronto para receber pagamentos ✅'
                                  : _isPending
                                      ? 'Caixa pendente de ativação ⏳'
                                      : 'Caixa bloqueado - contacte o administrador ❌',
                              style: TextStyle(
                                fontSize: 14,
                                color: _statusColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Resumo do dia
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.withOpacity(0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildSummaryItem(
                        'Total Hoje',
                        'MT ${_todayTotal.toStringAsFixed(2)}',
                        Colors.green,
                      ),
                      _buildSummaryItem(
                        'Transações',
                        '$_todayCount',
                        Colors.blue,
                      ),
                      _buildSummaryItem(
                        'Caixa',
                        _cashierName ?? 'N/A',
                        Colors.purple,
                      ),
                    ],
                  ),
                ),

                // Botão de pagamento
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 60,
                    child: ElevatedButton(
                      onPressed: _isActive ? _showPaymentDialog : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isActive ? Colors.green.shade700 : Colors.grey,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _isActive
                            ? '💳 Registrar Pagamento'
                            : _isPending
                                ? '⏳ Caixa Pendente'
                                : '🔒 Caixa Bloqueado',
                        style: const TextStyle(fontSize: 18),
                      ),
                    ),
                  ),
                ),

                // Últimos pagamentos
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(16),
                        topRight: Radius.circular(16),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Últimos Pagamentos',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Expanded(
                          child: _recentPayments.isEmpty
                              ? const Center(
                                  child: Text(
                                    'Nenhum pagamento hoje',
                                    style: TextStyle(color: Colors.grey),
                                  ),
                                )
                              : ListView.builder(
                                  itemCount: _recentPayments.length,
                                  itemBuilder: (context, index) {
                                    final payment = _recentPayments[index];
                                    return ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: Colors.green.shade100,
                                        child: Icon(
                                          Icons.payment,
                                          color: Colors.green.shade700,
                                          size: 20,
                                        ),
                                      ),
                                      title: Text(
                                        payment['description'] ?? 'Pagamento',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      subtitle: Text(
                                        payment['customerName'] ?? 'Cliente',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      trailing: Text(
                                        'MT ${(payment['amount'] ?? 0).toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.green,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  void _showPaymentDialog() {
    final amountController = TextEditingController();
    final descriptionController = TextEditingController();
    final customerController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Registrar Pagamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              decoration: const InputDecoration(
                labelText: 'Valor *',
                prefixText: 'MT ',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descrição',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: customerController,
              decoration: const InputDecoration(
                labelText: 'Cliente',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text);
              if (amount == null || amount <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Valor inválido')),
                );
                return;
              }

              Navigator.pop(context);

              try {
                final api = ApiService.instance;
                final response = await api.post(
                  '/cashier/payment',
                  {
                    'amount': amount,
                    'description': descriptionController.text.trim(),
                    'customerName': customerController.text.trim(),
                  },
                );

                if (response['success'] == true) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('✅ Pagamento registrado com sucesso!'),
                      backgroundColor: Colors.green,
                    ),
                  );
                  _loadDashboard();
                } else {
                  throw Exception(response['error']?['message'] ?? 'Erro');
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('❌ Erro: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text('Registrar'),
          ),
        ],
      ),
    );
  }
}