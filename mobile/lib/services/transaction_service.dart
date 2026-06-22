import 'dart:math';
import '../models/transaction.dart';

class TransactionService {
  static final List<Transaction> _mockLedger = [];

  static List<Transaction> getAll() => _mockLedger;

  static List<Transaction> getByUser(String userId) {
    return _mockLedger.where((tx) => tx.from == userId || tx.to == userId).toList();
  }

  static void add(Transaction tx) {
    _mockLedger.add(tx);
  }

  static Transaction create({
    required String from,
    required String to,
    required double amount,
    required TransactionType type,
    required String description,
  }) {
    final tx = Transaction(
      id: _generateId(),
      from: from,
      to: to,
      amount: amount,
      type: type,
      description: description,
      createdAt: DateTime.now(),
    );

    add(tx);
    return tx;
  }

  static String _generateId() {
    const chars = '0123456789';
    final rand = Random();
    return 'TXN-${List.generate(12, (_) => chars[rand.nextInt(chars.length)]).join()}';
  }

  static void clear() {
    _mockLedger.clear();
  }
}
