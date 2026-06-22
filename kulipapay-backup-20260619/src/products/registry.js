/**
 * PRODUCTS REGISTRY
 * Registo central de todos os produtos
 */

const merchant = require('./merchant');

// FUTURO: adicionar outros produtos
// const individual = require('./individual');
// const agent = require('./agent');
// const business = require('./business');

const PRODUCTS = {
  MERCHANT: merchant,
  // INDIVIDUAL: individual,
  // AGENT: agent,
  // BUSINESS: business,
};

function getProductsFor(accountType) {
  return PRODUCTS[accountType] || null;
}

function getModulesFor(accountType) {
  const product = getProductsFor(accountType);
  return product ? product.modules : [];
}

function getLimitsFor(accountType) {
  const product = getProductsFor(accountType);
  return product ? product.limits : null;
}

module.exports = {
  PRODUCTS,
  getProductsFor,
  getModulesFor,
  getLimitsFor
};
