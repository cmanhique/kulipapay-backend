import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import '../../services/api_service.dart';
import 'cashier_dashboard.dart';

class CashierLoginScreen extends StatefulWidget {
  final String? inviteCode;

  const CashierLoginScreen({super.key, this.inviteCode});

  @override
  State<CashierLoginScreen> createState() => _CashierLoginScreenState();
}

class _CashierLoginScreenState extends State<CashierLoginScreen> {
  final TextEditingController _inviteCodeController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;

  // 🔥 QR CODE
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    if (widget.inviteCode != null && widget.inviteCode!.isNotEmpty) {
      _inviteCodeController.text = widget.inviteCode!;
    }
  }

  @override
  void dispose() {
    _inviteCodeController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    controller?.dispose();
    super.dispose();
  }

  void _onQRViewCreated(QRViewController controller) {
    this.controller = controller;
    controller.scannedDataStream.listen((scanData) {
      if (!_isScanning) {
        _isScanning = true;
        final code = scanData.code;
        if (code != null && code.isNotEmpty) {
          setState(() {
            _inviteCodeController.text = code;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Código escaneado: $code')),
          );
          _isScanning = false;
        }
      }
    });
  }

  Future<void> _loginAsCashier() async {
    final inviteCode = _inviteCodeController.text.trim();
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (inviteCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, informe o código de convite')),
      );
      return;
    }

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, informe o seu nome')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final api = ApiService.instance;
      final response = await api.cashierLogin({
        'inviteCode': inviteCode,
        'name': name,
        'phone': phone,
      });

      if (response['success'] == true) {
        final token = response['token'];
        api.setToken(token);

        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const CashierDashboard()),
        );
      } else {
        throw Exception(response['error']?['message'] ?? 'Erro no login do caixa');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao entrar como caixa: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Entrar como Caixa'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.qr_code, size: 80, color: Colors.green),
            const SizedBox(height: 16),
            const Text(
              'Convite de Caixa',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Digite o código de convite ou escaneie o QR Code',
              style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),

            // 🔥 SCANNER QR CODE
            Container(
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[300]!),
                borderRadius: BorderRadius.circular(12),
              ),
              child: QRView(
                key: qrKey,
                onQRViewCreated: _onQRViewCreated,
                overlay: QrScannerOverlayShape(
                  borderColor: Colors.green,
                  borderRadius: 10,
                  borderLength: 20,
                  borderWidth: 4,
                  cutOutSize: 180,
                ),
              ),
            ),

            const SizedBox(height: 16),
            const Text(
              'OU',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _inviteCodeController,
              decoration: const InputDecoration(
                labelText: 'Código de Convite *',
                prefixIcon: Icon(Icons.qr_code),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nome Completo *',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: 'Telefone',
                prefixIcon: Icon(Icons.phone),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _loginAsCashier,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade700,
                  foregroundColor: Colors.white,
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Entrar como Caixa'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}