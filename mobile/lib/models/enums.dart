enum AccountType {
  individual,
  merchant,
  business,
}

enum KycStatus {
  pending,
  approved,
  rejected,
}

enum TransactionType {
  transfer,
  cashIn,
  cashOut,
  qrPayment,
  commission,
  reversal,
}

enum LedgerStatus {
  pending,
  settled,
  failed,
}

enum RiskLevel {
  low,
  medium,
  high,
  critical,
}
