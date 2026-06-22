import 'package:flutter/material.dart';

class TransactionModel {
  final String id;
  final String title;
  final double amount;
  final String type; // credit / debit
  final DateTime date;
  final String? category;

  TransactionModel({
    required this.id,
    required this.title,
    required this.amount,
    required this.type,
    required this.date,
    this.category,
  });

  bool get isCredit => type == 'credit' || type == 'DEPOSIT' || type == 'TRANSFER_IN';
  bool get isDebit => type == 'debit' || type == 'TRANSFER_OUT';

  String get formattedAmount {
    return '${isCredit ? '+' : '-'} ${amount.toStringAsFixed(2)} MT';
  }

  Color get amountColor => isCredit ? Colors.green : Colors.red;
}