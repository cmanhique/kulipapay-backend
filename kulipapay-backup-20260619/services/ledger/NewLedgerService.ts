import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditEntryInput {
  transactionRef: string;
  type: string;
  entries: Array<{
    accountCode: string;
    entryType: 'DEBIT' | 'CREDIT';
    amount: number;
    description?: string;
  }>;
  createdBy: string;
  metadata?: Record<string, any>;
}

export class NewLedgerService {
  
  async createAuditEntry(data: AuditEntryInput) {
    return await prisma.$transaction(async (tx) => {
      const totalDebits = data.entries
        .filter(e => e.entryType === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalCredits = data.entries
        .filter(e => e.entryType === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Debits (${totalDebits}) must equal credits (${totalCredits})`);
      }
      
      const transaction = await tx.financialTransaction.create({
        data: {
          transaction_ref: data.transactionRef,
          type: data.type,
          created_by: data.createdBy,
          status: 'PENDING',
          metadata: data.metadata || {},
          description: `Audit entry for ${data.type}`
        }
      });
      
      for (const entry of data.entries) {
        const account = await tx.ledgerAccount.findUnique({
          where: { code: entry.accountCode }
        });
        
        if (!account) {
          throw new Error(`Ledger account not found: ${entry.accountCode}`);
        }
        
        await tx.journalEntry.create({
          data: {
            transaction_id: transaction.id,
            ledger_account_id: account.id,
            entry_type: entry.entryType,
            amount: entry.amount,
            currency: 'MZN',
            description: entry.description || `Entry for ${entry.accountCode}`
          }
        });
        
        await this.updateAccountBalance(tx, account.id, entry.accountCode, entry.entryType, entry.amount);
      }
      
      await tx.financialTransaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'CONFIRMED',
          posted_at: new Date()
        }
      });
      
      return transaction;
    });
  }
  
  private async updateAccountBalance(
    tx: any,
    ledgerAccountId: string,
    accountCode: string,
    entryType: 'DEBIT' | 'CREDIT',
    amount: number
  ) {
    let balance = await tx.accountBalance.findUnique({
      where: {
        ledger_account_id_account_kp_id: {
          ledger_account_id: ledgerAccountId,
          account_kp_id: 'SYSTEM'
        }
      }
    });
    
    if (!balance) {
      balance = await tx.accountBalance.create({
        data: {
          ledger_account_id: ledgerAccountId,
          account_kp_id: 'SYSTEM',
          balance: 0,
          version: 1
        }
      });
    }
    
    const increment = entryType === 'DEBIT' ? amount : -amount;
    
    await tx.accountBalance.update({
      where: { id: balance.id },
      data: {
        balance: { increment: increment },
        version: { increment: 1 },
        last_updated: new Date()
      }
    });
  }
  
  async getAccountBalance(accountCode: string): Promise<number> {
    const ledgerAccount = await prisma.ledgerAccount.findUnique({
      where: { code: accountCode }
    });
    
    if (!ledgerAccount) {
      throw new Error(`Account ${accountCode} not found`);
    }
    
    const balance = await prisma.accountBalance.findUnique({
      where: {
        ledger_account_id_account_kp_id: {
          ledger_account_id: ledgerAccount.id,
          account_kp_id: 'SYSTEM'
        }
      }
    });
    
    return balance?.balance || 0;
  }
}

export default new NewLedgerService();
