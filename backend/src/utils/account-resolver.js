/**
 * Account identity resolver.
 * KP_ID = external public identifier; UUID (Account.id) = internal DB identifier.
 */
const { prisma } = require('../prisma');

const VALID_ACCOUNT_TYPES = ['INDIVIDUAL', 'MERCHANT', 'AGENT', 'ENTERPRISE', 'BUSINESS'];

async function resolveAccount(key) {
  if (!key) return null;

  return prisma.account.findFirst({
    where: {
      OR: [{ id: key }, { kp_id: key }],
    },
    include: {
      wallet: true,
      merchantProfile: true,
      enterpriseProfile: true,
      agent: true,
    },
  });
}

async function resolveMerchant(key) {
  const account = await prisma.account.findFirst({
    where: {
      OR: [{ id: key }, { kp_id: key }],
      account_type: 'MERCHANT',
    },
    include: { merchantProfile: true },
  });

  if (!account?.merchantProfile) return null;

  return {
    accountId: account.id,
    kpId: account.kp_id,
    account,
    merchantProfile: account.merchantProfile,
  };
}

async function resolveMerchantByKpId(kpId) {
  return resolveMerchant(kpId);
}

async function resolveAgent(kpId) {
  const account = await prisma.account.findFirst({
    where: { kp_id: kpId, account_type: 'AGENT' },
    include: { agent: true },
  });

  if (!account?.agent) return null;

  return {
    accountId: account.id,
    kpId: account.kp_id,
    account,
    agent: account.agent,
  };
}

async function resolveEnterprise(key) {
  const account = await prisma.account.findFirst({
    where: {
      OR: [{ id: key }, { kp_id: key }],
      account_type: 'ENTERPRISE',
    },
    include: { enterpriseProfile: true },
  });

  if (!account?.enterpriseProfile) return null;

  return {
    accountId: account.id,
    kpId: account.kp_id,
    account,
    enterpriseProfile: account.enterpriseProfile,
  };
}

function isValidAccountType(type) {
  return VALID_ACCOUNT_TYPES.includes(type);
}

module.exports = {
  VALID_ACCOUNT_TYPES,
  resolveAccount,
  resolveMerchant,
  resolveMerchantByKpId,
  resolveAgent,
  resolveEnterprise,
  isValidAccountType,
};
