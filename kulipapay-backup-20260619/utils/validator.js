// =========================
// VALIDATOR CORE (INDUSTRIAL LEVEL)
// =========================

const crypto = require('crypto');

// =========================
// ERRORS
// =========================

class ValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

// =========================
// AMOUNT (MONEY SAFE)
// =========================

function normalizeAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    throw new ValidationError('INVALID_AMOUNT', 'Amount must be a valid number');
  }

  if (value <= 0) {
    throw new ValidationError('INVALID_AMOUNT', 'Amount must be greater than zero');
  }

  // convert to cents (avoid floating point issues)
  return Math.round(value * 100);
}

// =========================
// PHONE (E.164 STRICT)
// =========================

function normalizePhone(phone) {
  if (!phone) {
    throw new ValidationError('PHONE_REQUIRED', 'Phone is required');
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  const e164Regex = /^\+[1-9]\d{7,14}$/;

  if (!e164Regex.test(cleaned)) {
    throw new ValidationError('INVALID_PHONE', 'Phone must be in E.164 format');
  }

  return cleaned;
}

// =========================
// EMAIL
// =========================

function validateEmail(email) {
  if (!email) {
    throw new ValidationError('EMAIL_REQUIRED', 'Email is required');
  }

  const value = email.toLowerCase().trim();

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(value)) {
    throw new ValidationError('INVALID_EMAIL', 'Invalid email format');
  }

  return value;
}

// =========================
// PASSWORD (STRONG SECURITY)
// =========================

function validatePassword(password) {
  if (!password) {
    throw new ValidationError('PASSWORD_REQUIRED', 'Password is required');
  }

  if (password.length < 8) {
    throw new ValidationError('WEAK_PASSWORD', 'Password must be at least 8 characters');
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    throw new ValidationError(
      'WEAK_PASSWORD',
      'Password must contain letters and numbers'
    );
  }

  if (!hasSymbol) {
    throw new ValidationError(
      'WEAK_PASSWORD',
      'Password must contain at least one symbol'
    );
  }

  return true;
}

// =========================
// SAFE ID GENERATOR
// =========================

function generateKpId(country = 'XX') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();

  return `KP-${country}-${timestamp}-${random}`;
}

// =========================
// BUSINESS TYPE VALIDATOR
// =========================

function validateBusinessType(type) {
  const validTypes = ['RESTAURANT', 'GROCERY', 'PHARMACY', 'SERVICES', 'OTHER'];
  if (!type) return 'OTHER';
  const upper = type.toUpperCase();
  return validTypes.includes(upper) ? upper : 'OTHER';
}

// =========================
// EXPORTS
// =========================

module.exports = {
  ValidationError,
  normalizeAmount,
  normalizePhone,
  validateEmail,
  validatePassword,
  generateKpId,
  validateBusinessType
};