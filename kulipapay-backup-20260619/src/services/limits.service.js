const LIMITS = {
  INDIVIDUAL: {
    dailySend: 10000,
    perTransaction: 10000,
    monthlySend: 50000,
    dailyReceive: 100000,
    balance: 100000
  },
  MERCHANT: {
    dailySend: 50000,
    perTransaction: 25000,
    monthlySend: 250000,
    dailyReceive: 500000,
    balance: 500000
  },
  BUSINESS: {
    dailySend: 500000,
    perTransaction: 100000,
    monthlySend: 5000000,
    dailyReceive: 999999999,
    balance: 999999999
  }
};

function getLimits(accountType) {
  return LIMITS[accountType] || LIMITS.INDIVIDUAL;
}

module.exports = { getLimits };
