import 'enums.dart';

class RiskScore {
  final String id;
  final String kpId;

  final int score;
  final RiskLevel level;

  final DateTime updatedAt;

  RiskScore({
    required this.id,
    required this.kpId,
    required this.score,
    required this.level,
    required this.updatedAt,
  });

  factory RiskScore.fromJson(Map<String, dynamic> json) {
    return RiskScore(
      id: json['id'],
      kpId: json['kp_id'],
      score: json['score'],
      level: RiskLevel.values.firstWhere(
        (e) => e.name == json['level'],
        orElse: () => RiskLevel.low,
      ),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}
