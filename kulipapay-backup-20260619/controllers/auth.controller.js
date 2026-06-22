generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/* =========================
   ENUMS
========================= */

enum AccountType {
  INDIVIDUAL
  MERCHANT
  BUSINESS
}

enum AccountStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  BLOCKED
}

enum TransactionType {
  TRANSFER
  DEPOSIT
  WITHDRAWAL
  PAYMENT
  CASH_IN
  CASH_OUT
  REFUND
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REVERSED
}

enum LedgerType {
  DEBIT
  CREDIT
}

enum KycStatus {
  PENDING
  APPROVED
  REJECTED
}

/* =========================
   ACCOUNT
========================= */

model Account {
  id            String        @id @default(uuid())
  kpId          String        @unique @map("kp_id")

  email         String?       @unique
  phone         String        @unique
  name          String?

  passwordHash  String        @map("password_hash")

  accountType   AccountType   @default(INDIVIDUAL)
  status        AccountStatus @default(ACTIVE)

  country       String        @default("MZ")
  isAgent       Boolean       @default(false) @map("is_agent")

  pin           String?
  kycStatus     KycStatus     @default(PENDING) @map("kyc_status")

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  wallet        Wallet?
  sessions      Session[]
  transactions  Transaction[]
  ledgerEntries LedgerEntry[]
  auditLogs     AuditLog[]
  kycProfiles   KycProfile[]

  @@index([kpId])
  @@index([phone])
  @@map("accounts")
}

/* =========================
   WALLET
========================= */

model Wallet {
  id        String   @id @default(uuid())
  kpId      String   @unique @map("kp_id")

  account   Account  @relation(fields: [kpId], references: [kpId], onDelete: Cascade)

  balance   Decimal  @default(0) @db.Decimal(18,2)
  currency  String   @default("MZN")
  version   Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("wallets")
}

/* =========================
   TRANSACTION
========================= */

model Transaction {
  id              String            @id @default(uuid())
  reference       String            @unique

  idempotencyKey  String?           @unique @map("idempotency_key")

  type            TransactionType
  status          TransactionStatus @default(PENDING)

  fromKpId        String?           @map("from_kp_id")
  toKpId          String?           @map("to_kp_id")

  amount          Decimal           @db.Decimal(18,2)
  fee             Decimal           @default(0) @db.Decimal(18,2)
  currency        String            @default("MZN")

  description     String?

  createdAt       DateTime          @default(now())
  processedAt     DateTime?

  ledgerEntries   LedgerEntry[]

  @@index([fromKpId])
  @@index([toKpId])
  @@index([status])
  @@map("transactions")
}

/* =========================
   LEDGER
========================= */

model LedgerEntry {
  id              String   @id @default(uuid())

  transactionId   String
  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  kpId            String
  account         Account @relation(fields: [kpId], references: [kpId], onDelete: Cascade)

  type            LedgerType

  amount          Decimal  @db.Decimal(18,2)
  balanceBefore   Decimal  @db.Decimal(18,2)
  balanceAfter    Decimal  @db.Decimal(18,2)

  createdAt       DateTime @default(now())

  @@index([kpId])
  @@index([transactionId])
  @@map("ledger_entries")
}

/* =========================
   SESSION
========================= */

model Session {
  id            String   @id @default(uuid())

  kpId          String
  account       Account  @relation(fields: [kpId], references: [kpId], onDelete: Cascade)

  refreshToken  String   @unique @map("refresh_token")

  ipAddress     String?
  userAgent     String?
  expiresAt     DateTime

  createdAt     DateTime @default(now())

  @@index([kpId])
  @@map("sessions")
}

/* =========================
   KYC
========================= */

model KycProfile {
  id              String   @id @default(uuid())

  kpId            String   @unique
  account         Account  @relation(fields: [kpId], references: [kpId], onDelete: Cascade)

  documentType    String?
  documentNumber  String?

  status          KycStatus @default(PENDING)

  submittedAt     DateTime @default(now())
  reviewedAt      DateTime?

  @@map("kyc_profiles")
}

/* =========================
   AUDIT LOG
========================= */

model AuditLog {
  id          String   @id @default(uuid())

  kpId        String
  account     Account  @relation(fields: [kpId], references: [kpId], onDelete: Cascade)

  action      String
  metadata    Json?
  ipAddress   String?

  createdAt   DateTime @default(now())

  @@index([kpId])
  @@index([action])
  @@map("audit_logs")
}