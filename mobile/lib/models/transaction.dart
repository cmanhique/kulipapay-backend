import 'package:flutter/material.dart';

enum TransactionType {
  credit,
  debit,
  fee,
  transfer,
  payment,
}

extension TransactionTypeExtension on TransactionType {
  String get label {
    switch (this) {
      case TransactionType.credit:
        return 'Recebimento';
      case TransactionType.debit:
        return 'Pagamento';
      case TransactionType.fee:
        return 'Taxa';
      case TransactionType.transfer:
        return 'Transferência';
      case TransactionType.payment:
        return 'Pagamento QR';
    }
  }

  Color get color {
    switch (this) {
      case TransactionType.credit:
        return Colors.green;
      case TransactionType.debit:
        return Colors.red;
      case TransactionType.fee:
        return Colors.orange;
      case TransactionType.transfer:
        return Colors.blue;
      case TransactionType.payment:
        return Colors.purple;
    }
  }

  IconData get icon {
    switch (this) {
      case TransactionType.credit:
        return Icons.arrow_downward;
      case TransactionType.debit:
        return Icons.arrow_upward;
      case TransactionType.fee:
        return Icons.money_off;
      case TransactionType.transfer:
        return Icons.swap_horiz;
      case TransactionType.payment:
        return Icons.qr_code;
    }
  }
}

class Transaction {
  final String id;
  final String from;
  final String to;
  final double amount;
  final TransactionType type;
  final String description;
  final DateTime createdAt;

  Transaction({
    required this.id,
    required this.from,
    required this.to,
    required this.amount,
    required this.type,
    required this.description,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'from': from,
      'to': to,
      'amount': amount,
      'type': type.name,
      'description': description,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
