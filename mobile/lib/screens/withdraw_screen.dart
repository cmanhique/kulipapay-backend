import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../utils/format_utils.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final TextEditingController amountController = TextEditingController();
  final TextEditingController agentCodeController = TextEditingController();
  bool isLoading = false;

  Future<void> _withdraw() async {
    if (amountController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Digite o valor')),
      );
      return;
    }

    if (agentCodeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Digite o código do agente')),
      );
      return;
    }

    final amount = double.tryParse(amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valor inválido')),
      );
      return;
    }

    setState(() => isLoading = true);

    // Simular levantamento
    await Future.delayed(const Duration(seconds: 2));
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Levantamento de ${amount.toStringAsFixed(2)} MT solicitado!')),
    );

    setState(() => isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final countryCode = authProvider.countryCode ?? 'MZ';

    return Scaffold(
      appBar: AppBar(title: const Text('Levantamento')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Icon(Icons.upload, size: 64, color: Colors.orange),
            const SizedBox(height: 24),
            const Text(
              'Levantar Dinheiro',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'Digite o valor e o código do agente para levantar dinheiro.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            TextField(
              controller: amountController,
              decoration: const InputDecoration(
                labelText: 'Valor (MT)',
                prefixIcon: Icon(Icons.money),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: agentCodeController,
              decoration: const InputDecoration(
                labelText: 'Código do Agente',
                prefixIcon: Icon(Icons.badge),
                border: OutlineInputBorder(),
                helperText: 'Código fornecido pelo agente KulipaPay',
              ),
            ),
            const SizedBox(height: 24),
            if (isLoading)
              const CircularProgressIndicator()
            else
              ElevatedButton(
                onPressed: _withdraw,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  backgroundColor: Colors.orange,
                ),
                child: const Text('Levantar', style: TextStyle(fontSize: 16)),
              ),
          ],
        ),
      ),
    );
  }
}
