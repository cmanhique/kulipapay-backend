class P2PTransfer {
  final String fromUser;
  final String toUser;
  final double amount;
  final String description;

  P2PTransfer({
    required this.fromUser,
    required this.toUser,
    required this.amount,
    required this.description,
  });

  Map<String, dynamic> toJson() {
    return {
      'from': fromUser,
      'to': toUser,
      'amount': amount,
      'description': description,
    };
  }

  factory P2PTransfer.fromJson(Map<String, dynamic> json) {
    return P2PTransfer(
      fromUser: json['from'],
      toUser: json['to'],
      amount: json['amount'].toDouble(),
      description: json['description'],
    );
  }
}
