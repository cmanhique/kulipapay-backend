const fastify = require('fastify');
const cors = require('@fastify/cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = fastify({ logger: true });
const SECRET = 'kulipapay-secret-key';

// Dados em memória
const users = new Map();
const wallets = new Map();
const sessions = new Map();
const transactions = new Map(); // Histórico de transações
let transactionCounter = 1;

app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok' }));

// Registro
app.post('/api/auth/register', async (request, reply) => {
  try {
    const { email, phone, password, country = 'MZ' } = request.body;
    
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const kpId = `${country}-${random}-1`;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    users.set(kpId, {
      id: kpId,
      kp_id: kpId,
      email: email,
      phone: phone,
      password_hash: hashedPassword,
      account_type: 'INDIVIDUAL',
      country: country
    });
    
    wallets.set(kpId, { kp_id: kpId, balance: 0 });
    
    const token = jwt.sign({ kpId }, SECRET, { expiresIn: '7d' });
    
    return reply.send({ success: true, kpId, token });
  } catch (error) {
    return reply.status(400).send({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (request, reply) => {
  try {
    const { identifier, password } = request.body;
    
    let user = null;
    for (const u of users.values()) {
      if (u.email === identifier || u.phone === identifier) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
    }
    
    const token = jwt.sign({ kpId: user.kp_id }, SECRET, { expiresIn: '7d' });
    sessions.set(token, { kp_id: user.kp_id, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    
    return reply.send({ success: true, token, kpId: user.kp_id });
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  return reply.send({ success: true });
});

async function authenticate(request, reply) {
  try {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: 'NO_TOKEN_PROVIDED' });
    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'INVALID_TOKEN' });
  }
}

// Ver saldo
app.get('/api/wallet/balance', { preHandler: authenticate }, async (request, reply) => {
  const { kpId } = request.user;
  const wallet = wallets.get(kpId) || { balance: 0 };
  return reply.send({ balance: wallet.balance, kpId });
});

// Depositar (com registo no histórico)
app.post('/api/wallet/deposit', { preHandler: authenticate }, async (request, reply) => {
  const { kpId } = request.user;
  const { amount, agentId } = request.body;
  
  const wallet = wallets.get(kpId);
  if (!wallet) return reply.status(404).send({ error: 'WALLET_NOT_FOUND' });
  
  const oldBalance = wallet.balance;
  wallet.balance += amount;
  wallets.set(kpId, wallet);
  
  // Registrar transação no histórico
  const txId = `TX-${transactionCounter++}`;
  const transaction = {
    id: txId,
    type: 'DEPOSIT',
    amount: amount,
    oldBalance: oldBalance,
    newBalance: wallet.balance,
    date: new Date().toISOString(),
    status: 'COMPLETED',
    agentId: agentId || 'SYSTEM'
  };
  
  if (!transactions.has(kpId)) {
    transactions.set(kpId, []);
  }
  transactions.get(kpId).push(transaction);
  
  return reply.send({ success: true, balance: wallet.balance, transaction: transaction });
});

// Transferir (com registo no histórico)
app.post('/api/wallet/transfer', { preHandler: authenticate }, async (request, reply) => {
  const { kpId: fromKp } = request.user;
  const { toKp, amount, description } = request.body;
  
  const fromWallet = wallets.get(fromKp);
  const toWallet = wallets.get(toKp);
  
  if (!fromWallet) return reply.status(404).send({ error: 'SOURCE_WALLET_NOT_FOUND' });
  if (!toWallet) return reply.status(404).send({ error: 'DESTINATION_WALLET_NOT_FOUND' });
  if (fromWallet.balance < amount) return reply.status(400).send({ error: 'INSUFFICIENT_BALANCE' });
  
  const fromOldBalance = fromWallet.balance;
  const toOldBalance = toWallet.balance;
  
  fromWallet.balance -= amount;
  toWallet.balance += amount;
  
  wallets.set(fromKp, fromWallet);
  wallets.set(toKp, toWallet);
  
  // Registrar transação de saída
  const txId1 = `TX-${transactionCounter++}`;
  const fromTransaction = {
    id: txId1,
    type: 'TRANSFER_OUT',
    amount: amount,
    counterparty: toKp,
    oldBalance: fromOldBalance,
    newBalance: fromWallet.balance,
    date: new Date().toISOString(),
    status: 'COMPLETED',
    description: description || `Transferência para ${toKp}`
  };
  
  if (!transactions.has(fromKp)) {
    transactions.set(fromKp, []);
  }
  transactions.get(fromKp).push(fromTransaction);
  
  // Registrar transação de entrada
  const txId2 = `TX-${transactionCounter++}`;
  const toTransaction = {
    id: txId2,
    type: 'TRANSFER_IN',
    amount: amount,
    counterparty: fromKp,
    oldBalance: toOldBalance,
    newBalance: toWallet.balance,
    date: new Date().toISOString(),
    status: 'COMPLETED',
    description: description || `Transferência de ${fromKp}`
  };
  
  if (!transactions.has(toKp)) {
    transactions.set(toKp, []);
  }
  transactions.get(toKp).push(toTransaction);
  
  return reply.send({ 
    success: true, 
    fromBalance: fromWallet.balance, 
    toBalance: toWallet.balance,
    transaction: fromTransaction
  });
});

// Histórico de transações
app.get('/api/wallet/transactions', { preHandler: authenticate }, async (request, reply) => {
  const { kpId } = request.user;
  const userTransactions = transactions.get(kpId) || [];
  
  // Ordenar por data mais recente primeiro
  userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return reply.send({ 
    transactions: userTransactions,
    total: userTransactions.length
  });
});

// Ver dados do usuário
app.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
  const { kpId } = request.user;
  const user = users.get(kpId);
  const wallet = wallets.get(kpId);
  const userTransactions = transactions.get(kpId) || [];
  
  return reply.send({
    kp_id: kpId,
    email: user?.email,
    phone: user?.phone,
    country: user?.country || 'MZ',
    wallet: { balance: wallet?.balance || 0 },
    transactions: userTransactions.slice(0, 10) // últimas 10 transações
  });
});

// Listar agentes (comerciantes credenciados)
app.get('/api/agents', async (request, reply) => {
  // Agentes de depósito/levantamento
  const agents = [
    {
      id: 'AGENT-001',
      name: 'Agente Cerveja',
      location: 'Maputo - Av. Marginal',
      phone: '+258840000001',
      commission: 1.5 // %
    },
    {
      id: 'AGENT-002',
      name: 'Agente Shoprite',
      location: 'Maputo - Baixa',
      phone: '+258840000002',
      commission: 1.0
    },
    {
      id: 'AGENT-003',
      name: 'Agente 24/7',
      location: 'Matola - Mercado',
      phone: '+258840000003',
      commission: 2.0
    }
  ];
  
  return reply.send({ agents });
});

// Depósito via agente
app.post('/api/wallet/agent-deposit', { preHandler: authenticate }, async (request, reply) => {
  const { kpId } = request.user;
  const { agentId, amount, agentCode } = request.body;
  
  // Verificar código do agente
  if (!agentCode || agentCode !== 'AGENT2024') {
    return reply.status(401).send({ error: 'INVALID_AGENT_CODE' });
  }
  
  const wallet = wallets.get(kpId);
  if (!wallet) return reply.status(404).send({ error: 'WALLET_NOT_FOUND' });
  
  const oldBalance = wallet.balance;
  wallet.balance += amount;
  wallets.set(kpId, wallet);
  
  // Registrar transação com agente
  const txId = `TX-${transactionCounter++}`;
  const transaction = {
    id: txId,
    type: 'AGENT_DEPOSIT',
    amount: amount,
    agentId: agentId,
    oldBalance: oldBalance,
    newBalance: wallet.balance,
    date: new Date().toISOString(),
    status: 'COMPLETED'
  };
  
  if (!transactions.has(kpId)) {
    transactions.set(kpId, []);
  }
  transactions.get(kpId).push(transaction);
  
  return reply.send({ 
    success: true, 
    balance: wallet.balance, 
    transaction: transaction,
    message: `Depósito de ${amount} MT realizado através do agente`
  });
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('\n🏦 KulipaPay Server Running (Memory Mode)');
    console.log('📡 http://localhost:3000');
    console.log('❤️  http://localhost:3000/health\n');
    console.log('📝 Funcionalidades:');
    console.log('  ✅ Registo/Login');
    console.log('  ✅ Depósitos');
    console.log('  ✅ Transferências');
    console.log('  ✅ Histórico de transações');
    console.log('  ✅ Agentes de depósito\n');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
