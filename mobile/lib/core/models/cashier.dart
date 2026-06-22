class Cashier {
  final String id;
  final String merchantId;
  final String name;
  final String? email;
  final String? phone;
  final String status;
  final String inviteCode;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int paymentCount;

  Cashier({
    required this.id,
    required this.merchantId,
    required this.name,
    this.email,
    this.phone,
    required this.status,
    required this.inviteCode,
    required this.createdAt,
    required this.updatedAt,
    this.paymentCount = 0,
  });

  factory Cashier.fromJson(Map<String, dynamic> json) {
    return Cashier(
      id: json['id'] ?? '',
      merchantId: json['merchantId'] ?? '',
      name: json['name'] ?? '',
      email: json['email'],
      phone: json['phone'],
      status: json['status'] ?? 'PENDING',
      inviteCode: json['inviteCode'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      paymentCount: json['payments']?.length ?? 0,
    );
  }
}