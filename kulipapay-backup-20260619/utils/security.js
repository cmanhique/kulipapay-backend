const crypto = require('crypto');

function generateDeviceFingerprint(ip, userAgent, additionalData = {}) {
  const data = JSON.stringify({
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    ...additionalData
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

function isIpSuspicious(currentIp, previousIp) {
  if (!previousIp) return false;
  if (currentIp === previousIp) return false;
  
  const currentParts = currentIp ? currentIp.split('.') : [];
  const previousParts = previousIp ? previousIp.split('.') : [];
  
  if (currentParts.length === 4 && previousParts.length === 4) {
    if (currentParts[0] !== previousParts[0] || 
        currentParts[1] !== previousParts[1]) {
      return true;
    }
  }
  
  return false;
}

function isUserAgentSuspicious(current, previous) {
  if (!previous) return false;
  if (current === previous) return false;
  
  const isMobile = (ua) => /mobile|android|iphone|ipad/i.test(ua || '');
  const isDesktop = (ua) => /windows|mac|linux/i.test(ua || '');
  
  if (isMobile(current) && isDesktop(previous)) return true;
  if (isDesktop(current) && isMobile(previous)) return true;
  
  return false;
}

async function enforceSessionLimit(kp_id, maxSessions = 3) {
  const { prisma } = require('../prisma');
  
  const activeSessions = await prisma.session.count({
    where: {
      kp_id,
      revoked: false
    }
  });
  
  if (activeSessions >= maxSessions) {
    const oldestSession = await prisma.session.findFirst({
      where: {
        kp_id,
        revoked: false
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    if (oldestSession) {
      await prisma.session.update({
        where: { id: oldestSession.id },
        data: { revoked: true }
      });
    }
  }
}

module.exports = {
  generateDeviceFingerprint,
  isIpSuspicious,
  isUserAgentSuspicious,
  enforceSessionLimit
};