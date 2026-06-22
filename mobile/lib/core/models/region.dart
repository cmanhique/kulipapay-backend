class RegionStats {
  final String regionId;
  final String regionName;
  final String regionCode;
  final double totalSales;
  final double totalFees;
  final double totalNet;
  final int count;

  RegionStats({
    required this.regionId,
    required this.regionName,
    required this.regionCode,
    required this.totalSales,
    required this.totalFees,
    required this.totalNet,
    required this.count,
  });

  factory RegionStats.fromJson(Map<String, dynamic> json) {
    return RegionStats(
      regionId: json['regionId'] ?? '',
      regionName: json['regionName'] ?? json['name'] ?? '',
      regionCode: json['regionCode'] ?? '',
      totalSales: (json['totalSales'] ?? 0).toDouble(),
      totalFees: (json['totalFees'] ?? 0).toDouble(),
      totalNet: (json['totalNet'] ?? 0).toDouble(),
      count: json['count'] ?? 0,
    );
  }
}

class GlobalDashboard {
  final double totalSales;
  final double totalFees;
  final double totalNet;
  final int totalCount;
  final int regionCount;
  final List<RegionStats> byRegion;

  GlobalDashboard({
    required this.totalSales,
    required this.totalFees,
    required this.totalNet,
    required this.totalCount,
    required this.regionCount,
    required this.byRegion,
  });

  factory GlobalDashboard.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    final summary = data['summary'] ?? {};
    final byRegion = data['byRegion'] ?? [];

    return GlobalDashboard(
      totalSales: (summary['totalSales'] ?? 0).toDouble(),
      totalFees: (summary['totalFees'] ?? 0).toDouble(),
      totalNet: (summary['totalNet'] ?? 0).toDouble(),
      totalCount: summary['totalCount'] ?? 0,
      regionCount: summary['regionCount'] ?? 0,
      byRegion: byRegion.map<RegionStats>((r) => RegionStats.fromJson(r)).toList(),
    );
  }
}