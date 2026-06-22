import '../models/p2p_transfer.dart';
import '../models/transaction.dart';
import 'api_service.dart';
import 'transaction_service.dart';

class P2PService {
  static Future<bool> transfer(P2PTransfer tx) async {
    try {
      // VALIDAÇÕES
      if (tx.amount <= 0) {
        return false;
      }

      if (tx.fromUser.isEmpty || tx.toUser.isEmpty) {
        return false;
      }

      if (tx.fromUser == tx.toUser) {
        return false;
      }

      final api = ApiService.instance;

      // CHAMADA AO BACKEND REAL
      final newBalance = await api.transfer(tx.toUser, tx.amount);

      // REGISTO NO LEDGER LOCAL (débito)
      TransactionService.create(
        from: tx.fromUser,
        to: tx.toUser,
        amount: tx.amount,
        type: TransactionType.debit,
        description: 'Transferência P2P: ${tx.description}',
      );

      // REGISTO NO LEDGER LOCAL (crédito)
      TransactionService.create(
        from: tx.fromUser,
        to: tx.toUser,
        amount: tx.amount,
        type: TransactionType.credit,
        description: 'Transferência P2P recebida: ${tx.description}',
      );

      return true;
    } catch (e) {
      print('Transfer error: $e');
      return false;
    }
  }

  static Future<double> getBalance(String userId) async {
    try {
      final api = ApiService.instance;
      return await api.balance();
    } catch (e) {
      print('Balance error: $e');
      return 0.0;
    }
  }
}
