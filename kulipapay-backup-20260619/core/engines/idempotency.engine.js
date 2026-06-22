const crypto = require('crypto');
const { prisma } = require('../../prisma');

class IdempotencyEngine {

  hash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async start(key, kp_id, requestData) {
    if (!key) {
      return { shouldProcess: true, isNew: true };
    }

    const hash = this.hash(requestData);

    try {
      await prisma.idempotencyKey.create({
        data: {
          key,
          kp_id,
          request_hash: hash,
          status: 'PROCESSING'
        }
      });

      return { shouldProcess: true, isNew: true };
    } catch (e) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key }
      });

      if (!existing) {
        return { shouldProcess: true, isNew: true };
      }

      if (existing.request_hash !== hash) {
        throw new Error('Idempotency key reused with different payload');
      }

      if (existing.status === 'DONE') {
        return {
          shouldProcess: false,
          response: existing.response,
          status: 'DONE'
        };
      }

      if (existing.status === 'PROCESSING') {
        return {
          shouldProcess: false,
          retryLater: true,
          status: 'PROCESSING'
        };
      }

      if (existing.status === 'FAILED') {
        await prisma.idempotencyKey.update({
          where: { key },
          data: {
            status: 'PROCESSING',
            updated_at: new Date()
          }
        });
        return { shouldProcess: true, isNew: false, retryAfterFail: true };
      }

      return { shouldProcess: true, isNew: true };
    }
  }

  async complete(key, response) {
    if (!key) return;

    await prisma.idempotencyKey.update({
      where: { key },
      data: {
        response: response,
        status: 'DONE',
        updated_at: new Date()
      }
    });
  }

  async fail(key, error) {
    if (!key) return;

    await prisma.idempotencyKey.update({
      where: { key },
      data: {
        response: { error: error.message },
        status: 'FAILED',
        updated_at: new Date()
      }
    });
  }

  async getStatus(key) {
    if (!key) return null;

    return await prisma.idempotencyKey.findUnique({
      where: { key }
    });
  }
}

module.exports = new IdempotencyEngine();