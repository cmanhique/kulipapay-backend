class AgentFloatBalance {
  final String id;
  final String agentKpId;

  final double floatBalance;
  final double cashBalance;
  final double commissionBalance;

  final DateTime createdAt;
  final DateTime updatedAt;

  AgentFloatBalance({
    required this.id,
    required this.agentKpId,
    required this.floatBalance,
    required this.cashBalance,
    required this.commissionBalance,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AgentFloatBalance.fromJson(Map<String, dynamic> json) {
    return AgentFloatBalance(
      id: json['id'],
      agentKpId: json['agent_kp_id'],
      floatBalance: double.parse(json['float_balance'].toString()),
      cashBalance: double.parse(json['cash_balance'].toString()),
      commissionBalance: double.parse(json['commission_balance'].toString()),
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}
