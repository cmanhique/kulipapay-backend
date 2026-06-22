const { prisma } = require('../../prisma');

module.exports = async function dbCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch (error) {
    console.error('DB Check Error:', error.message);
    return 'error';
  }
};