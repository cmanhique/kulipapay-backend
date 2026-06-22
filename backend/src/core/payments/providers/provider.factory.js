/**
 * PROVIDER FACTORY
 */

const MpesaProvider = require('./mpesa.provider');
const EMolaProvider = require('./emola.provider');
const MkeshProvider = require('./mkesh.provider');

const PROVIDER_MAP = {
  MPESA: MpesaProvider,
  EMOLA: EMolaProvider,
  MKESH: MkeshProvider
};

class ProviderFactory {
  
  static get(providerName) {
    const Provider = PROVIDER_MAP[providerName];
    if (!Provider) {
      throw new Error(`Provider ${providerName} not supported`);
    }
    return new Provider();
  }
  
  static has(providerName) {
    return !!PROVIDER_MAP[providerName];
  }
}

module.exports = ProviderFactory;
