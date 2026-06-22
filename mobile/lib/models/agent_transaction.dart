import 'enums.dart';

class AgentTransaction {
  final String id;
  final String agentKpId;
  final String customerKpId;

  final TransactionType type;
  final double amount;

  final double feeCustomer;
  final double feeAgent;
  final double feeCompany;

  final String reference;
  final String status;

  final DateTime createdAt;

  AgentTransaction({
    required this.id,
    required this.agentKpId,
    required this.customerKpId,
    required this.type,
    required this.amount,
    required this.feeCustomer,
    required this.feeAgent,
    required this.feeCompany,
    required this.reference,
    required this.status,
    required this.createdAt,
  });

  factory AgentTransaction.fromJson(Map<String, dynamic> json) {
    return AgentTransaction(
      id: json['id'],
      agentKpId: json['agent_kp'],
      customerKpId: json['customer_kp'],
      type: TransactionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TransactionType.cashIn,
      ),
      amount: double.parse(json['amount'].toString()),
      feeCustomer: double.parse(json['fee_customer'].toString()),
      feeAgent: double.parse(json['fee_agent'].toString()),
      feeCompany: double.parse(json['fee_company'].toString()),
      reference: json['reference'],
      status: json['status'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
