const jwt = require('jsonwebtoken');

module.exports = async function authCheck() {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'kulipa-secret-key-change-in-production';
    
    const testToken = jwt.sign({ test: true }, JWT_SECRET, {
      expiresIn: '1s'
    });

    jwt.verify(testToken, JWT_SECRET);

    return 'ok';
  } catch (error) {
    console.error('Auth Check Error:', error.message);
    return 'error';
  }
};