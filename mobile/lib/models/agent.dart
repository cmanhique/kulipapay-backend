class Agent {
  final String id;
  final String kpId;

  final String businessName;
  final String phone;
  final String? email;

  final double floatBalance;
  final double commissionRate;

  final String status;
  final String? location;

  final double totalDeposits;
  final double totalWithdraws;
  final double totalCommission;

  final DateTime createdAt;
  final DateTime updatedAt;

  Agent({
    required this.id,
    required this.kpId,
    required this.businessName,
    required this.phone,
    required this.floatBalance,
    required this.commissionRate,
    required this.status,
    required this.totalDeposits,
    required this.totalWithdraws,
    required this.totalCommission,
    required this.createdAt,
    required this.updatedAt,
    this.email,
    this.location,
  });

  factory Agent.fromJson(Map<String, dynamic> json) {
    return Agent(
      id: json['id'],
      kpId: json['kp_id'],
      businessName: json['business_name'],
      phone: json['phone'],
      email: json['email'],
      floatBalance: double.parse(json['float_balance'].toString()),
      commissionRate: double.parse(json['commission_rate'].toString()),
      status: json['status'],
      location: json['location'],
      totalDeposits: double.parse(json['total_deposits'].toString()),
      totalWithdraws: double.parse(json['total_withdraws'].toString()),
      totalCommission: double.parse(json['total_commission'].toString()),
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}
