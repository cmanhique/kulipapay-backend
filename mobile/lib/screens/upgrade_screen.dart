import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class UpgradeAccountScreen extends StatefulWidget {
  const UpgradeAccountScreen({super.key});

  @override
  State<UpgradeAccountScreen> createState() => _UpgradeAccountScreenState();
}

class _UpgradeAccountScreenState extends State<UpgradeAccountScreen> {
  final ApiService _api = ApiService.instance;
  
  String selectedType = 'MERCHANT';
  bool isLoading = false;
  Map<String, dynamic>? kycStatus;
  
  // MERCHANT fields
  final TextEditingController businessNameController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController documentNumberController = TextEditingController();
  final TextEditingController nuitController = TextEditingController();
  
  // BUSINESS fields
  final TextEditingController companyNameController = TextEditingController();
  final TextEditingController fiscalAddressController = TextEditingController();
  final TextEditingController commercialRegController = TextEditingController();
  final TextEditingController legalRepController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadKycStatus();
  }

  Future<void> _loadKycStatus() async {
    try {
      final status = await _api.getKycStatus();
      setState(() {
        kycStatus = status;
      });
    } catch (e) {
      print('Error loading KYC status: $e');
    }
  }

  Future<void> _submitKyc() async {
    setState(() => isLoading = true);
    
    final data = selectedType == 'MERCHANT'
        ? {
            'type': selectedType,
            'businessName': businessNameController.text,
            'address': addressController.text,
            'documentNumber': documentNumberController.text,
            'nuit': nuitController.text,
          }
        : {
            'type': selectedType,
            'businessName': companyNameController.text,
            'address': fiscalAddressController.text,
            'nuit': nuitController.text,
            'commercialReg': commercialRegController.text,
            'legalRepName': legalRepController.text,
          };
    
    try {
      await _api.submitKyc(data);
      await _loadKycStatus();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pedido enviado! Aguarde aprovação.')),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final currentType = authProvider.accountType;
    
    // Se já for MERCHANT ou BUSINESS, mostrar status
    if (currentType == 'MERCHANT' || currentType == 'BUSINESS') {
      return Scaffold(
        appBar: AppBar(title: const Text('Tipo de Conta')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 80, color: Colors.green),
              const SizedBox(height: 24),
              Text(
                'Conta ${currentType == 'MERCHANT' ? 'Comerciante' : 'Empresarial'}',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              if (kycStatus != null)
                Text(
                  'Status KYC: ${kycStatus!['status'] ?? 'PENDENTE'}',
                  style: const TextStyle(fontSize: 16),
                ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Voltar'),
              ),
            ],
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(title: const Text('Upgrade de Conta')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.upgrade, size: 64, color: Colors.blue),
            const SizedBox(height: 24),
            const Text(
              'Escolha o tipo de conta',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            
            // Seleção de tipo
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'MERCHANT', label: Text('Comerciante'), icon: Icon(Icons.store)),
                ButtonSegment(value: 'BUSINESS', label: Text('Empresa'), icon: Icon(Icons.business)),
              ],
              selected: {selectedType},
              onSelectionChanged: (Set<String> selection) {
                setState(() {
                  selectedType = selection.first;
                });
              },
            ),
            const SizedBox(height: 32),
            
            // Formulário dinâmico
            if (selectedType == 'MERCHANT') _buildMerchantForm(),
            if (selectedType == 'BUSINESS') _buildBusinessForm(),
            
            const SizedBox(height: 32),
            
            if (isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton(
                onPressed: _submitKyc,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  backgroundColor: Colors.green,
                ),
                child: const Text('Submeter Pedido', style: TextStyle(fontSize: 16)),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildMerchantForm() {
    return Column(
      children: [
        TextField(
          controller: businessNameController,
          decoration: const InputDecoration(
            labelText: 'Nome do Negócio',
            prefixIcon: Icon(Icons.store),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: addressController,
          decoration: const InputDecoration(
            labelText: 'Localização / Endereço',
            prefixIcon: Icon(Icons.location_on),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: documentNumberController,
          decoration: const InputDecoration(
            labelText: 'Número de Identificação (BI)',
            prefixIcon: Icon(Icons.badge),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: nuitController,
          decoration: const InputDecoration(
            labelText: 'NUIT (Número Único)',
            prefixIcon: Icon(Icons.numbers),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(
            children: [
              Icon(Icons.info, color: Colors.blue),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Após submeter, aguarde aprovação do administrador',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildBusinessForm() {
    return Column(
      children: [
        TextField(
          controller: companyNameController,
          decoration: const InputDecoration(
            labelText: 'Nome da Empresa',
            prefixIcon: Icon(Icons.business),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: fiscalAddressController,
          decoration: const InputDecoration(
            labelText: 'Endereço Fiscal',
            prefixIcon: Icon(Icons.location_city),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: nuitController,
          decoration: const InputDecoration(
            labelText: 'NUIT',
            prefixIcon: Icon(Icons.numbers),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: commercialRegController,
          decoration: const InputDecoration(
            labelText: 'Registo Comercial',
            prefixIcon: Icon(Icons.description),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: legalRepController,
          decoration: const InputDecoration(
            labelText: 'Representante Legal',
            prefixIcon: Icon(Icons.person),
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(
            children: [
              Icon(Icons.info, color: Colors.blue),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Documentos adicionais podem ser solicitados',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
