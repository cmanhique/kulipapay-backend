const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS agent_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) UNIQUE,
        float_balance DECIMAL(15,2) DEFAULT 0,
        cash_balance DECIMAL(15,2) DEFAULT 0,
        commission_balance DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS agent_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agent_accounts(id),
        customer_id UUID REFERENCES users(id),
        transaction_type VARCHAR(30),
        amount DECIMAL(15,2),
        fee DECIMAL(15,2),
        commission DECIMAL(15,2),
        status VARCHAR(30),
        customer_confirmed BOOLEAN DEFAULT FALSE,
        agent_pin_verified BOOLEAN DEFAULT FALSE,
        transaction_ref VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS agent_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agent_accounts(id),
        transaction_id UUID REFERENCES agent_transactions(id),
        amount DECIMAL(15,2),
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW(),
        paid_at TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS agent_float_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agent_accounts(id),
        amount DECIMAL(15,2),
        status VARCHAR(20) DEFAULT 'PENDING',
        admin_notes TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        processed_by UUID REFERENCES users(id)
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_agent_transactions_agent ON agent_transactions(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_transactions_customer ON agent_transactions(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_transactions_status ON agent_transactions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_float_requests_agent ON agent_float_requests(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_float_requests_status ON agent_float_requests(status)`
  ];
  
  try {
    for (const query of queries) {
      await pool.query(query);
      console.log('✓ Query executada com sucesso');
    }
    console.log('\n✅ Todas as tabelas do agente foram criadas!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
};

createTables();
