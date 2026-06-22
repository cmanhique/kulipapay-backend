import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class AdminUsersListScreen extends StatefulWidget {
  const AdminUsersListScreen({super.key});

  @override
  State<AdminUsersListScreen> createState() => _AdminUsersListScreenState();
}

class _AdminUsersListScreenState extends State<AdminUsersListScreen> {
  List<dynamic> users = [];
  bool isLoading = true;
  String searchQuery = '';
  int currentPage = 1;
  int totalPages = 1;
  final ApiService _api = ApiService.instance;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => isLoading = true);
    try {
      final response = await _api.getAdminUsers(page: currentPage, search: searchQuery);
      setState(() {
        users = response['users'] ?? [];
        totalPages = response['totalPages'] ?? 1;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    }
  }

  Future<void> _toggleBlock(String kpId, bool isBlocked) async {
    try {
      await _api.toggleBlockUser(kpId);
      await _loadUsers();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isBlocked ? 'Utilizador desbloqueado' : 'Utilizador bloqueado')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Utilizadores'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Pesquisar...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: (value) {
                searchQuery = value;
                currentPage = 1;
                _loadUsers();
              },
            ),
          ),
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : users.isEmpty
              ? const Center(child: Text('Nenhum utilizador encontrado'))
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        itemCount: users.length,
                        itemBuilder: (context, index) {
                          final user = users[index];
                          final wallet = user['wallet'];
                          final isBlocked = user['status'] == 'BLOCKED';
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isBlocked ? Colors.red : Colors.green,
                                child: Text(user['name']?.substring(0, 1).toUpperCase() ?? 'U'),
                              ),
                              title: Text(user['name'] ?? user['email'] ?? 'Sem nome'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('ID: ${user['kp_id']}'),
                                  Text('Email: ${user['email'] ?? 'N/A'}'),
                                  Text('Telefone: ${user['phone']}'),
                                  Text('Saldo: ${wallet?['balance'] ?? 0} MT'),
                                  Text('Tipo: ${user['account_type']}'),
                                ],
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      isBlocked ? Icons.check_circle : Icons.block,
                                      color: isBlocked ? Colors.green : Colors.red,
                                    ),
                                    onPressed: () => _toggleBlock(user['kp_id'], isBlocked),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    if (totalPages > 1)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.chevron_left),
                              onPressed: currentPage > 1 ? () {
                                currentPage--;
                                _loadUsers();
                              } : null,
                            ),
                            Text('Página $currentPage de $totalPages'),
                            IconButton(
                              icon: const Icon(Icons.chevron_right),
                              onPressed: currentPage < totalPages ? () {
                                currentPage++;
                                _loadUsers();
                              } : null,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
    );
  }
}
