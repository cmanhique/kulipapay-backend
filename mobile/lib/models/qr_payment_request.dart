class QRPaymentRequest {
  final String merchantId;
  final double amount;
  final DateTime expiresAt;
  final String nonce;
  final String? description;

  QRPaymentRequest({
    required this.merchantId,
    required this.amount,
    required this.expiresAt,
    required this.nonce,
    this.description,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  int get remainingSeconds => expiresAt.difference(DateTime.now()).inSeconds;

  Map<String, dynamic> toJson() {
    return {
      'merchant_id': merchantId,
      'amount': amount,
      'expires_at': expiresAt.toIso8601String(),
      'nonce': nonce,
      'description': description,
    };
  }

  static QRPaymentRequest fromJson(Map<String, dynamic> json) {
    return QRPaymentRequest(
      merchantId: json['merchant_id'],
      amount: json['amount'].toDouble(),
      expiresAt: DateTime.parse(json['expires_at']),
      nonce: json['nonce'],
      description: json['description'],
    );
  }

  @override
  String toString() => toJson().toString();
}
