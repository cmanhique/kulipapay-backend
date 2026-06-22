const { prisma } = require('../../prisma');

module.exports = async function refundCheck() {
  try {
    const refund = await prisma.refundRequest.findFirst({
      select: { id: true },
      take: 1
    });
    return 'ok';
  } catch (error) {
    console.error('Refund Check Error:', error.message);
    return 'error';
  }
};