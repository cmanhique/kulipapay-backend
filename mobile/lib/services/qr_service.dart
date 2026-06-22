import 'dart:math';
import '../models/qr_payment_request.dart';

class QRService {
  static QRPaymentRequest generate({
    required String merchantId,
    required double amount,
    String? description,
  }) {
    final now = DateTime.now();
    final expiresAt = now.add(const Duration(minutes: 15));
    final nonce = _generateNonce();

    return QRPaymentRequest(
      merchantId: merchantId,
      amount: amount,
      expiresAt: expiresAt,
      nonce: nonce,
      description: description,
    );
  }

  static String _generateNonce() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final rand = Random();
    return List.generate(16, (index) => chars[rand.nextInt(chars.length)]).join();
  }

  static bool isValid(QRPaymentRequest qr) {
    return !qr.isExpired;
  }
}
