function validatePassword(password) {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSymbol,
    errors: {
      minLength: !minLength,
      hasUpper: !hasUpper,
      hasLower: !hasLower,
      hasNumber: !hasNumber,
      hasSymbol: !hasSymbol
    }
  };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^\+258[0-9]{9}$/;
  return phoneRegex.test(phone);
}

function generateKpId(type, country = 'MZ') {
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const typeCode = {
    INDIVIDUAL: '1',
    MERCHANT: '2',
    BUSINESS: '3'
  }[type];
  return `${country}-${random}-${typeCode}`;
}

module.exports = {
  validatePassword,
  validateEmail,
  validatePhone,
  generateKpId
};
