class FeeEngine {
  constructor() {
    this.defaultFeeRate = 0.02; // 2%
    this.minFee = 0.50;
    this.maxFee = 100;
  }

  calculate(amount, merchantType = 'standard', isInternal = false) {
    if (isInternal) {
      return {
        total: 0,
        rate: 0,
        breakdown: {
          platform: 0,
          merchant: 0,
          agent: 0
        }
      };
    }

    let rate = this.defaultFeeRate;

    if (merchantType === 'premium') {
      rate = 0.01;
    } else if (merchantType === 'enterprise') {
      rate = 0.005;
    }

    const totalFee = Number(amount) * rate;
    const finalFee = Math.max(Math.min(totalFee, this.maxFee), this.minFee);

    return {
      total: finalFee,
      rate,
      breakdown: {
        platform: finalFee * 0.7,
        merchant: finalFee * 0.2,
        agent: finalFee * 0.1
      }
    };
  }
}

module.exports = FeeEngine;
