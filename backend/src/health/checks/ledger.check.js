const { prisma } = require('../../prisma');

module.exports = async function ledgerCheck() {
  try {
    const tx = await prisma.transaction.findFirst({
      select: { id: true },
      take: 1
    });
    return 'ok';
  } catch (error) {
    console.error('Ledger Check Error:', error.message);
    return 'error';
  }
};