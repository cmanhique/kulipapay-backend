class Wallet {
  final String id;
  final String kpId;
  final double balance;
  final int version;

  Wallet({
    required this.id,
    required this.kpId,
    required this.balance,
    required this.version,
  });

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['id'],
      kpId: json['kp_id'],
      balance: double.parse(json['balance'].toString()),
      version: json['version'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'kp_id': kpId,
      'balance': balance,
      'version': version,
    };
  }
}
