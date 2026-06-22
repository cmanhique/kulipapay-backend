import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/wallet_provider.dart';
import '../providers/auth_provider.dart';
import '../utils/format_utils.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = false;
  List<dynamic> _transactions = [];
  String? _error;

  Future<void> _loadTransactions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiService = Provider.of<WalletProvider>(context, listen: false);
      await apiService.loadTransactions();
      
      // Acessar as transações diretamente
      final walletProvider = Provider.of<WalletProvider>(context, listen: false);
      setState(() {
        _transactions = walletProvider.transactions;
        _isLoading = false;
      });
      
      print('Transações carregadas: ${_transactions.length}');
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
      print('Erro: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final countryCode = authProvider.countryCode ?? 'MZ';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Histórico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTransactions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Erro: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadTransactions,
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : _transactions.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('Nenhuma transação'),
                          SizedBox(height: 8),
                          Text('Faça um depósito para começar'),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _transactions.length,
                      itemBuilder: (context, index) {
                        final tx = _transactions[index];
                        final isPositive = tx['type'] == 'DEPOSIT' || tx['type'] == 'TRANSFER_IN';
                        final date = DateTime.parse(tx['date']);
                        
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: Icon(
                              isPositive ? Icons.arrow_downward : Icons.arrow_upward,
                              color: isPositive ? Colors.green : Colors.red,
                            ),
                            title: Text(
                              tx['type'] == 'DEPOSIT' ? 'Depósito' :
                              tx['type'] == 'TRANSFER_IN' ? 'Recebido' :
                              tx['type'] == 'TRANSFER_OUT' ? 'Enviado' : tx['type']
                            ),
                            subtitle: Text(
                              '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}'
                            ),
                            trailing: Text(
                              '${isPositive ? '+' : '-'} ${FormatUtils.formatMoney(tx['amount'].toDouble(), countryCode: countryCode)}',
                              style: TextStyle(
                                color: isPositive ? Colors.green : Colors.red,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
