const { prisma } = require('../../prisma');

module.exports = async function identityCheck() {
  try {
    const account = await prisma.account.findFirst({
      select: { id: true },
      take: 1
    });
    return 'ok';
  } catch (error) {
    console.error('Identity Check Error:', error.message);
    return 'error';
  }
};