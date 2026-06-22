import 'package:flutter/material.dart';

class CashierListScreen extends StatefulWidget {
  const CashierListScreen({super.key});

  @override
  State<CashierListScreen> createState() => _CashierListScreenState();
}

class _CashierListScreenState extends State<CashierListScreen> {
  List<Map<String, dynamic>> _cashiers = [];
  bool _isLoading = true;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCashiers();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadCashiers() async {
    setState(() => _isLoading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 400));
      _cashiers = [];
    } catch (_) {
      _cashiers = [];
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _createCashier() async {
    final name = _nameController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nome obrigatório')),
      );
      return;
    }

    final newCashier = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'name': name,
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'status': 'PENDING',
      'inviteCode': 'INV-${DateTime.now().millisecondsSinceEpoch}',
    };

    setState(() {
      _cashiers.insert(0, newCashier);
    });

    _nameController.clear();
    _emailController.clear();
    _phoneController.clear();

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Caixa criado')),
      );
    }
  }

  void _showCreateDialog() {
    _nameController.clear();
    _emailController.clear();
    _phoneController.clear();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Novo Caixa'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nome *'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Telefone'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: _createCashier,
            child: const Text('Criar'),
          ),
        ],
      ),
    );
  }

  void _showQRCode(String? inviteCode, String name) {
    final code = inviteCode ?? '';

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Convite - $name'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.qr_code, size: 120),
            const SizedBox(height: 16),
            Text(
              code.isEmpty ? 'Sem código' : code,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'QR para entrada do caixa',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
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

  String _statusLabel(String status) {
    switch (status) {
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
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showCreateDialog,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _cashiers.isEmpty
              ? const Center(
                  child: Text('Nenhum caixa criado'),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _cashiers.length,
                  itemBuilder: (context, index) {
                    final c = _cashiers[index];

                    final name = c['name'] ?? 'Sem nome';
                    final status = c['status'] ?? 'UNKNOWN';

                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              _statusColor(status).withOpacity(0.2),
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'C',
                            style: TextStyle(
                              color: _statusColor(status),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(name),
                        subtitle: Text(_statusLabel(status)),
                        trailing: IconButton(
                          icon: const Icon(Icons.qr_code),
                          onPressed: () =>
                              _showQRCode(c['inviteCode'], name),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
