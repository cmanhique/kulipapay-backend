const { prisma } = require('../prisma');

async function computeRisk({ kp_id, ip, fingerprint }) {
  let score = 0;
  const reasons = [];

  const recentSessions = await prisma.session.count({
    where: {
      kp_id,
      created_at: {
        gte: new Date(Date.now() - 10 * 60 * 1000)
      }
    }
  });

  if (recentSessions >= 3) {
    score += 40;
    reasons.push('Multiple sessions in 10 minutes');
  }

  const session = await prisma.session.findFirst({
    where: { kp_id, revoked: false },
    orderBy: { created_at: 'desc' }
  });

  if (!session || session.fingerprint !== fingerprint) {
    score += 50;
    reasons.push('New device detected');
  }

  if (session?.ip && session.ip !== ip) {
    score += 20;
    reasons.push('IP address changed');
  }

  let level = 'LOW';
  let action = 'ALLOW';

  if (score >= 80) {
    level = 'HIGH';
    action = 'BLOCK';
  } else if (score >= 40) {
    level = 'MEDIUM';
    action = 'STEP_UP';
  }

  await prisma.riskScore.upsert({
    where: { kp_id },
    update: { 
      score: score, 
      level: level, 
      updated_at: new Date() 
    },
    create: { 
      kp_id, 
      score: score, 
      level: level 
    }
  });

  if (score >= 40) {
    await prisma.fraudAlert.create({
      data: {
        kp_id,
        type: 'AUTOMATIC',
        severity: level,
        details: {
          score,
          reasons,
          ip,
          fingerprint,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  return { score, level, action, reasons };
}

module.exports = { computeRisk };
