import 'enums.dart';

class Account {
  final String id;
  final String kpId;
  final String? email;
  final String phone;
  final String? name;

  final AccountType accountType;
  final String role;
  final String status;
  final String country;

  final DateTime createdAt;
  final DateTime updatedAt;

  final bool isAgent;

  Account({
    required this.id,
    required this.kpId,
    required this.phone,
    required this.accountType,
    required this.role,
    required this.status,
    required this.country,
    required this.createdAt,
    required this.updatedAt,
    this.email,
    this.name,
    this.isAgent = false,
  });

  factory Account.fromJson(Map<String, dynamic> json) {
    return Account(
      id: json['id'],
      kpId: json['kp_id'],
      email: json['email'],
      phone: json['phone'],
      name: json['name'],
      accountType: AccountType.values.firstWhere(
        (e) => e.name == json['account_type'],
        orElse: () => AccountType.individual,
      ),
      role: json['role'],
      status: json['status'],
      country: json['country'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      isAgent: json['isAgent'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'kp_id': kpId,
      'email': email,
      'phone': phone,
      'name': name,
      'account_type': accountType.name,
      'role': role,
      'status': status,
      'country': country,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'isAgent': isAgent,
    };
  }
}
