/**
 * MIGRAR LEDGER ENTRIES
 * 
 * 🎯 Cria LedgerEntry para todas as transações existentes
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function migrate() {
  console.log('📊 INICIANDO MIGRAÇÃO DE LEDGER ENTRIES...\n');

  // Buscar TODAS as transações (sem filtro de status)
  const transactions = await prisma.transactionLedger.findMany({
    orderBy: { created_at: 'asc' }
  });

  console.log(`🔍 Encontradas ${transactions.length} transações\n`);

  let created = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // Verificar se já existe LedgerEntry para esta transação
    const existing = await prisma.ledgerEntry.findUnique({
      where: { reference: tx.reference }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Determinar from_kp e to_kp baseado no tipo
    const fromKp = tx.type === 'DEBIT' ? tx.kp_id : tx.metadata?.from || tx.metadata?.fromKp;
    const toKp = tx.type === 'CREDIT' ? tx.kp_id : tx.metadata?.to || tx.metadata?.toKp;

    // Se não tiver from/to, usar o próprio kp_id
    const finalFrom = fromKp || tx.kp_id;
    const finalTo = toKp || tx.kp_id;

    // Criar hash único
    const hash = crypto.createHash('sha256')
      .update(`${tx.reference}-${tx.kp_id}-${tx.amount}-${Date.now()}`)
      .digest('hex');

    // Criar LedgerEntry
    await prisma.ledgerEntry.create({
      data: {
        transaction_id: tx.reference,
        reference: tx.reference,
        from_kp: finalFrom,
        to_kp: finalTo,
        amount: Number(tx.amount),
        type: tx.type,
        status: 'SETTLED',
        debit_entries: tx.type === 'DEBIT' ? { amount: Number(tx.amount) } : {},
        credit_entries: tx.type === 'CREDIT' ? { amount: Number(tx.amount) } : {},
        previous_hash: '0',
        current_hash: hash,
        description: tx.metadata?.description || `Ledger entry for ${tx.reference}`,
        metadata: {
          originalTransaction: tx.reference,
          originalStatus: tx.status,
          migratedAt: new Date().toISOString()
        }
      }
    });

    created++;
    console.log(`✅ Criado LedgerEntry para ${tx.reference} (${tx.type})`);
  }

  console.log(`\n📊 RESUMO:`);
  console.log(`   ✅ Criados: ${created}`);
  console.log(`   ⏭️  Ignorados (já existem): ${skipped}`);
  console.log(`   📊 Total: ${transactions.length}`);

  await prisma.$disconnect();
}

migrate().catch(console.error);
