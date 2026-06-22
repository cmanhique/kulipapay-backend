import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../providers/wallet_provider.dart';
import '../../models/p2p_transfer.dart';
import '../../services/p2p_service.dart';
import '../../services/transaction_service.dart';
import '../transactions/transactions_screen.dart';

class TransferScreen extends StatefulWidget {
  const TransferScreen({super.key});

  @override
  State<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends State<TransferScreen> {
  final TextEditingController _toController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _toController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _sendTransfer() async {
    final to = _toController.text.trim();
    final amountStr = _amountController.text.trim();
    final description = _descriptionController.text.trim();

    // Validações
    if (to.isEmpty) {
      _showSnackBar('Por favor, informe o destinatário');
      return;
    }

    if (amountStr.isEmpty) {
      _showSnackBar('Por favor, informe o valor');
      return;
    }

    final amount = double.tryParse(amountStr);
    if (amount == null || amount <= 0) {
      _showSnackBar('Por favor, informe um valor válido');
      return;
    }

    final user = Provider.of<UserProvider>(context, listen: false);
    final wallet = Provider.of<WalletProvider>(context, listen: false);

    // Verificar saldo
    if (wallet.balance < amount) {
      _showSnackBar('Saldo insuficiente');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    // Criar transferência
    final tx = P2PTransfer(
      fromUser: user.kpId ?? 'me',
      toUser: to,
      amount: amount,
      description: description.isNotEmpty ? description : 'Transferência P2P',
    );

    final success = await P2PService.transfer(tx);

    setState(() {
      _isLoading = false;
    });

    if (success) {
      // Limpar campos
      _toController.clear();
      _amountController.clear();
      _descriptionController.clear();

      // Atualizar saldo e transações
      await wallet.loadBalance();
      await wallet.loadTransactions();

      _showSnackBar('✅ Transferência realizada com sucesso!', isSuccess: true);
    } else {
      _showSnackBar('❌ Falha na transferência. Verifique o saldo.', isSuccess: false);
    }
  }

  void _showSnackBar(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? Colors.green : Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wallet = context.watch<WalletProvider>();
    final user = context.watch<UserProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transferir Dinheiro'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TransactionsScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // =========================
            // SALDO DISPONÍVEL
            // =========================
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Saldo disponível',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${wallet.balance.toStringAsFixed(2)} MZN',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // =========================
            // DESTINATÁRIO
            // =========================
            const Text(
              'Destinatário (KP-ID)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _toController,
              decoration: const InputDecoration(
                hintText: 'KP-MZ-XXXXXXXX',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 16),

            // =========================
            // VALOR
            // =========================
            const Text(
              'Valor',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                hintText: '0.00',
                prefixIcon: Icon(Icons.money),
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 16),

            // =========================
            // DESCRIÇÃO
            // =========================
            const Text(
              'Descrição (opcional)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                hintText: 'Motivo da transferência',
                prefixIcon: Icon(Icons.note),
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 24),

            // =========================
            // BOTÃO ENVIAR
            // =========================
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _sendTransfer,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Enviar',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 12),

            // =========================
            // TAXA DE SERVIÇO (futuro)
            // =========================
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Taxa de serviço',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const Text(
                    '0.00 MZN',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
