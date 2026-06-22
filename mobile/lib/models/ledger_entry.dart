import 'enums.dart';

class LedgerEntry {
  final String id;
  final String transactionId;
  final String reference;

  final String fromKp;
  final String toKp;

  final double amount;
  final TransactionType type;
  final LedgerStatus status;

  final String? description;

  final DateTime createdAt;
  final DateTime? settledAt;

  LedgerEntry({
    required this.id,
    required this.transactionId,
    required this.reference,
    required this.fromKp,
    required this.toKp,
    required this.amount,
    required this.type,
    required this.status,
    this.description,
    required this.createdAt,
    this.settledAt,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) {
    return LedgerEntry(
      id: json['id'],
      transactionId: json['transaction_id'],
      reference: json['reference'],
      fromKp: json['from_kp'],
      toKp: json['to_kp'],
      amount: double.parse(json['amount'].toString()),
      type: TransactionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TransactionType.transfer,
      ),
      status: LedgerStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => LedgerStatus.settled,
      ),
      description: json['description'],
      createdAt: DateTime.parse(json['created_at']),
      settledAt: json['settled_at'] != null
          ? DateTime.parse(json['settled_at'])
          : null,
    );
  }
}
