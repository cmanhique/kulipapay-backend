import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, { origin: true });

// Health check
app.get('/health', async () => ({ 
  status: 'ok', 
  timestamp: new Date().toISOString() 
}));

// Criar nova identidade
app.post('/api/identity', async (request, reply) => {
  const body: any = request.body;
  const { phone, type = 'INDIVIDUAL' } = body;
  
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const typeCode = type === 'INDIVIDUAL' ? '1' : '2';
  const kpId = `KP-${random}-${typeCode}`;
  
  const identity = await prisma.identity.create({
    data: { 
      kp_id: kpId, 
      type: type, 
      phone: phone 
    }
  });
  
  await prisma.wallet.create({ 
    data: { kp_id: kpId } 
  });
  
  return { success: true, kpId, identity };
});

// Consultar saldo
app.get('/api/wallet/:kpId', async (request, reply) => {
  const params: any = request.params;
  const wallet = await prisma.wallet.findUnique({ 
    where: { kp_id: params.kpId } 
  });
  
  if (!wallet) {
    return reply.status(404).send({ error: 'Wallet not found' });
  }
  
  return { kpId: wallet.kp_id, balance: wallet.balance };
});

// Transferência
app.post('/api/transfer', async (request, reply) => {
  const body: any = request.body;
  const { from, to, amount, idempotencyKey } = body;
  
  const fromWallet = await prisma.wallet.findUnique({ where: { kp_id: from } });
  const toWallet = await prisma.wallet.findUnique({ where: { kp_id: to } });
  
  if (!fromWallet || !toWallet) {
    return reply.status(404).send({ error: 'Wallet not found' });
  }
  
  if (fromWallet.balance < amount) {
    return reply.status(400).send({ error: 'Insufficient balance' });
  }
  
  const result = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { kp_id: from },
      data: { balance: { decrement: amount } }
    });
    
    await tx.wallet.update({
      where: { kp_id: to },
      data: { balance: { increment: amount } }
    });
    
    const transaction = await tx.transaction.create({
      data: {
        idempotency_key: idempotencyKey,
        from_kp: from,
        to_kp: to,
        amount: amount,
        status: 'COMPLETED'
      }
    });
    
    return transaction;
  });
  
  return { success: true, txId: result.tx_id };
});

// Listar identidades
app.get('/api/identities', async () => {
  return await prisma.identity.findMany({
    include: { wallet: true }
  });
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('\n🚀 KulipaPay Backend is running!\n');
    console.log('📡 Server: http://localhost:3000');
    console.log('❤️  Health: http://localhost:3000/health\n');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
