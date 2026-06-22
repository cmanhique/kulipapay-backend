class MerchantStats {
  final double totalSales;
  final double totalFees;
  final double netSales;
  final int salesCount;
  final double balance;

  MerchantStats({
    required this.totalSales,
    required this.totalFees,
    required this.netSales,
    required this.salesCount,
    required this.balance,
  });

  factory MerchantStats.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return MerchantStats(
      totalSales: (data['totalSales'] ?? 0).toDouble(),
      totalFees: (data['totalFees'] ?? 0).toDouble(),
      netSales: (data['netSales'] ?? 0).toDouble(),
      salesCount: data['salesCount'] ?? 0,
      balance: (data['balance'] ?? 0).toDouble(),
    );
  }

  factory MerchantStats.empty() {
    return MerchantStats(
      totalSales: 0,
      totalFees: 0,
      netSales: 0,
      salesCount: 0,
      balance: 0,
    );
  }
}