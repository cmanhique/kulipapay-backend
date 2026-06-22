import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../models/account_type.dart';
import 'home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  final _businessName = TextEditingController();
  final _businessType = TextEditingController();
  final _location = TextEditingController();
  final _companyName = TextEditingController();
  final _sector = TextEditingController();
  final _employeeCount = TextEditingController();

  AccountType _type = AccountType.individual;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirm.dispose();
    _businessName.dispose();
    _businessType.dispose();
    _location.dispose();
    _companyName.dispose();
    _sector.dispose();
    _employeeCount.dispose();
    super.dispose();
  }

  String _formatPhone(String phone) {
    final p = phone.trim();
    if (p.isEmpty) return p;
    return p.startsWith('+258')
        ? p
        : (p.startsWith('0') ? '+258${p.substring(1)}' : '+258$p');
  }

  void _error(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Map<String, dynamic> _extraData() {
    switch (_type) {
      case AccountType.merchant:
        return {
          'businessName': _businessName.text.trim(),
          'businessType': _businessType.text.trim().toUpperCase(),
        };

      case AccountType.agent:
        return {
          'location': _location.text.trim(),
        };

      case AccountType.enterprise:
        return {
          'companyName': _companyName.text.trim(),
          'sector': _sector.text.trim().toUpperCase(),
          'employeeCount':
              int.tryParse(_employeeCount.text.trim()) ?? 0,
        };

      default:
        return {};
    }
  }

  bool _validate() {
    final name = _name.text.trim();
    final email = _email.text.trim();
    final phone = _phone.text.trim();
    final password = _password.text;
    final confirm = _confirm.text;

    if (name.isEmpty) {
      _error('Nome obrigatório');
      return false;
    }

    if (!email.contains('@')) {
      _error('Email inválido');
      return false;
    }

    if (phone.isEmpty) {
      _error('Telefone obrigatório');
      return false;
    }

    if (password.length < 8) {
      _error('Senha mínima: 8 caracteres');
      return false;
    }

    if (password != confirm) {
      _error('Senhas não coincidem');
      return false;
    }

    if (_type == AccountType.merchant) {
      if (_businessName.text.trim().isEmpty) {
        _error('Nome do negócio obrigatório');
        return false;
      }
      if (_businessType.text.trim().isEmpty) {
        _error('Tipo de negócio obrigatório');
        return false;
      }
    }

    if (_type == AccountType.enterprise) {
      if (_companyName.text.trim().isEmpty) {
        _error('Nome da empresa obrigatório');
        return false;
      }
      if (_sector.text.trim().isEmpty) {
        _error('Setor obrigatório');
        return false;
      }
    }

    return true;
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Criar Conta')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            children: [
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Nome'),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _email,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _phone,
                decoration: const InputDecoration(labelText: 'Telefone'),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Senha'),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _confirm,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirmar Senha'),
              ),

              const SizedBox(height: 16),

              DropdownButtonFormField<AccountType>(
                value: _type,
                items: AccountType.values
                    .map((e) => DropdownMenuItem(
                          value: e,
                          child: Text(e.label),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _type = v);
                },
                decoration:
                    const InputDecoration(labelText: 'Tipo de Conta'),
              ),

              const SizedBox(height: 16),

              if (_type == AccountType.merchant) ...[
                TextField(
                  controller: _businessName,
                  decoration:
                      const InputDecoration(labelText: 'Nome do Negócio'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _businessType,
                  decoration:
                      const InputDecoration(labelText: 'Tipo de Negócio'),
                ),
              ],

              if (_type == AccountType.agent)
                TextField(
                  controller: _location,
                  decoration:
                      const InputDecoration(labelText: 'Localização'),
                ),

              if (_type == AccountType.enterprise) ...[
                TextField(
                  controller: _companyName,
                  decoration:
                      const InputDecoration(labelText: 'Empresa'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _sector,
                  decoration:
                      const InputDecoration(labelText: 'Setor'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _employeeCount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Funcionários'),
                ),
              ],

              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: auth.isLoading
                      ? null
                      : () async {
                          if (!_validate()) return;

                          final success = await auth.register(
                            _email.text.trim(),
                            _formatPhone(_phone.text),
                            _password.text,
                            name: _name.text.trim(),
                            countryCode: 'MZ',
                            accountType: _type.apiValue,
                            extraData: _extraData(),
                          );

                          if (!mounted) return;

                          if (success) {
                            Navigator.pushAndRemoveUntil(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const HomeScreen()),
                              (_) => false,
                            );
                          } else {
                            _error('Falha ao criar conta');
                          }
                        },
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Criar Conta'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}