import { Account, BankConsent, Transaction } from '../types';
import { store } from './storage';
import { addNotification } from './notifications';
import { auditLogger } from './auditLogger';

/**
 * Account Aggregator (AA) India Architecture Specification & Ecosystem Role
 * --------------------------------------------------------------------------
 * The Reserve Bank of India (RBI) Account Aggregator framework (Master Directions - NBFC-AA 2016)
 * establishes a consent-driven, secure financial data-sharing infrastructure in India.
 *
 * Ecosystem Roles:
 * 1. Financial Information Provider (FIP):
 *    Regulated entities that hold consumer accounts (HDFC, ICICI, SBI, Axis, Zerodha, CDSL, etc.).
 * 2. Account Aggregator (AA):
 *    RBI-licensed NBFC-AA (Setu AA / Pine Labs, Finvu / Cookiejar, OneMoney, Anumati / Perfios).
 *    AAs are "data blind": they act as encrypted conduits, transferring digitally signed encrypted data
 *    from FIP to FIU without storing, viewing, or monetizing consumer data.
 * 3. Financial Information User (FIU):
 *    Regulated entity that receives customer financial information to deliver a service.
 *    CRITICAL LEGAL REALITY: Under RBI Master Directions, only entities regulated by an Indian
 *    financial sector regulator (RBI, SEBI, IRDAI, PFRDA) can directly register as an FIU.
 *    For a consumer PFM app like Paisa, there are two legitimate operational models:
 *    a) Partner with an authorized Regulated Entity (e.g. SEBI Registered Investment Advisor / NBFC)
 *       where the partner acts as the FIU of record and Paisa operates as the Technology Service Provider (TSP).
 *    b) File Imports (CSV / JSON): Zero regulatory barrier; users manually export and upload their data.
 * 4. Technology Service Provider (TSP):
 *    Entities (like Setu, Tartan, Perfios) providing developer-friendly SDKs and backend integration bridges.
 *
 * ABSOLUTE SECURITY & INTEGRITY CONSTRAINTS:
 * - NEVER collect or store internet banking passwords, MPINs, UPI PINs, OTPs, or CVVs.
 * - Screen-scraping and SMS sniffing are strictly rejected in favor of end-to-end encrypted AA pipes.
 * - Consent is granular, time-bound, revocable, and audited.
 */

export interface ConsentRequestParams {
  userId: string;
  provider: 'Setu AA' | 'Finvu' | 'OneMoney' | 'Anumati' | 'Demo AA Gateway';
  dataRangeMonths: number;
  consentDurationYears: number;
  selectedFips: string[]; // e.g. ['HDFC_BANK', 'ICICI_BANK', 'SBI']
}

export interface ConsentResult {
  consentId: string;
  consentUrl?: string; // Redirect URL for AA consent approval
  status: 'INITIATED' | 'PENDING_USER_APPROVAL' | 'ACTIVE' | 'FAILED' | 'EXPIRED' | 'REVOKED';
  accountsDiscovered: Array<{
    fipName: string;
    accountType: 'savings' | 'current' | 'credit_card';
    maskedAccNumber: string;
    balance: number;
  }>;
}

export const SUPPORTED_INDIAN_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', logo: '🏦', status: 'Live on AA', fipId: 'FIP-HDFC-01' },
  { id: 'ICICI', name: 'ICICI Bank', logo: '🏛️', status: 'Live on AA', fipId: 'FIP-ICICI-01' },
  { id: 'SBI', name: 'State Bank of India', logo: '🇮🇳', status: 'Live on AA', fipId: 'FIP-SBI-01' },
  { id: 'AXIS', name: 'Axis Bank', logo: '🏢', status: 'Live on AA', fipId: 'FIP-AXIS-01' },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank', logo: '💳', status: 'Live on AA', fipId: 'FIP-KOTAK-01' },
  { id: 'IDFC', name: 'IDFC FIRST Bank', logo: '⚡', status: 'Live on AA', fipId: 'FIP-IDFC-01' },
  { id: 'INDUSIND', name: 'IndusInd Bank', logo: '🏢', status: 'Live on AA', fipId: 'FIP-INDUS-01' },
  { id: 'CANARA', name: 'Canara Bank', logo: '🏛️', status: 'Live on AA', fipId: 'FIP-CANARA-01' },
];

export const ACCOUNT_AGGREGATORS = [
  { id: 'Setu AA', name: 'Setu (Pine Labs)', rbiLicense: 'N-14.00342', status: 'Available in Sandbox & Prod' },
  { id: 'Finvu', name: 'Finvu (Cookiejar)', rbiLicense: 'N-14.00331', status: 'Available' },
  { id: 'OneMoney', name: 'OneMoney', rbiLicense: 'N-14.00325', status: 'Available' },
  { id: 'Anumati', name: 'Anumati (Perfios)', rbiLicense: 'N-14.00344', status: 'Available' },
];

/**
 * Checks whether an active consent artifact has expired based on its expiry_date timestamp.
 */
export function isConsentExpired(consent: BankConsent): boolean {
  if (consent.status === 'EXPIRED' || consent.status === 'REVOKED') return true;
  const expiryTime = new Date(consent.expiry_date).getTime();
  return Date.now() > expiryTime;
}

/**
 * Simulates the RBI Account Aggregator consent process for development, testing, and sandbox verification.
 */
export async function simulateAaConsentFlow(params: ConsentRequestParams): Promise<ConsentResult> {
  // Simulate network latency of AA cryptographic handshake
  await new Promise(resolve => setTimeout(resolve, 600));

  const consentId = `SETU-AA-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const accountsDiscovered: ConsentResult['accountsDiscovered'] = [];

  if (params.selectedFips.includes('HDFC') || params.selectedFips.length === 0) {
    accountsDiscovered.push({
      fipName: 'HDFC Bank',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 78500,
    });
  }

  if (params.selectedFips.includes('ICICI') || params.selectedFips.length === 0) {
    accountsDiscovered.push({
      fipName: 'ICICI Bank',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 185000,
    });
  }

  if (params.selectedFips.includes('SBI')) {
    accountsDiscovered.push({
      fipName: 'State Bank of India',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 42300,
    });
  }

  return {
    consentId,
    status: 'ACTIVE',
    accountsDiscovered,
  };
}

/**
 * Generates sample transactions retrieved from a bank via Account Aggregator.
 */
export function generateSimulatedBankFeed(
  account: Account,
  count = 3
): Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[] {
  const indianVendors = [
    { merchant: 'Swiggy', desc: 'UPI/Swiggy-Bangalore/pay', amount: 380, cat: 'cat_food', method: 'UPI' as const },
    { merchant: 'Blinkit', desc: 'UPI/Blinkit-Commerce/order', amount: 520, cat: 'cat_groceries', method: 'UPI' as const },
    { merchant: 'Uber India', desc: 'UPI/Uber-Mobility/ride', amount: 240, cat: 'cat_transport', method: 'UPI' as const },
    { merchant: 'Zepto', desc: 'UPI/Zepto-Fast/groceries', amount: 310, cat: 'cat_groceries', method: 'UPI' as const },
    { merchant: 'Apollo Pharmacy', desc: 'POS DEBIT/Apollo Med/BLR', amount: 450, cat: 'cat_healthcare', method: 'Debit card' as const },
  ];

  const now = new Date();
  return indianVendors.slice(0, count).map((v, i) => ({
    user_id: account.user_id,
    account_id: account.id,
    transaction_date: new Date(now.getTime() - (i + 1) * 3600000 * 4).toISOString().slice(0, 10),
    merchant: v.merchant,
    description: v.desc,
    amount: v.amount,
    transaction_type: 'expense' as const,
    category_id: v.cat,
    payment_method: v.method,
    external_transaction_id: `AA-TXN-${Date.now()}-${i}`,
    is_unplanned: i === 0,
    notes: `Synced via Account Aggregator (${account.provider})`,
  }));
}

export interface SyncAccountResult {
  success: boolean;
  newTransactionsCount: number;
  duplicatesSkippedCount: number;
  updatedBalance: number;
  error?: string;
}

/**
 * Synchronizes an account by validating consent and fetching new incremental statement records.
 */
export async function syncAccountFeed(
  accountId: string,
  requestingUserId?: string
): Promise<SyncAccountResult> {
  const activeUserId = requestingUserId || store.getActiveUserId();
  const accounts = store.getAccounts(activeUserId);
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    return {
      success: false,
      newTransactionsCount: 0,
      duplicatesSkippedCount: 0,
      updatedBalance: 0,
      error: 'Account not found or access denied.',
    };
  }

  // 1. Consent Validation Check
  const consents = store.getBankConsents(activeUserId);
  const matchingConsents = consents
    .filter(c => c.accounts_linked.some(accName => account.account_name.includes(accName) || account.provider.includes(accName)))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const activeConsent = matchingConsents.find(c => !isConsentExpired(c));

  if (matchingConsents.length > 0 && !activeConsent) {
    store.updateAccount(accountId, { connection_status: 'consent_pending' }, activeUserId);
    addNotification({
      title: '⚠️ Bank Consent Expired',
      body: `Your statement sync consent for ${account.account_name} has expired. Please re-authorize to resume automated sync.`,
      type: 'warning',
    });
    return {
      success: false,
      newTransactionsCount: 0,
      duplicatesSkippedCount: 0,
      updatedBalance: account.balance,
      error: 'Bank consent has expired. Please re-authorize via Account Aggregator.',
    };
  }

  if (account.connection_status === 'disconnected') {
    return {
      success: false,
      newTransactionsCount: 0,
      duplicatesSkippedCount: 0,
      updatedBalance: account.balance,
      error: 'Account is disconnected. Reconnect to resume synchronization.',
    };
  }

  // 2. Fetch new feed items (simulated from FIP)
  const incomingFeed = generateSimulatedBankFeed(account, 2);
  const existingTxs = store.getTransactions(activeUserId);

  // 3. Deduplicate
  const newTransactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[] = [];
  let duplicatesCount = 0;

  for (const item of incomingFeed) {
    const isDup = existingTxs.some(
      t => (item.external_transaction_id && t.external_transaction_id === item.external_transaction_id) ||
           (t.transaction_date.slice(0, 10) === item.transaction_date.slice(0, 10) &&
            t.amount === item.amount &&
            t.merchant.toLowerCase() === item.merchant.toLowerCase())
    );

    if (isDup) {
      duplicatesCount++;
    } else {
      newTransactions.push(item);
    }
  }

  // 4. Ingest new transactions
  if (newTransactions.length > 0) {
    store.addTransactionsBulk(newTransactions);
  }

  // 5. Update Account Metadata & Balance
  const totalDebited = newTransactions.reduce((sum, t) => sum + t.amount, 0);
  const updatedBalance = Math.max(0, account.balance - totalDebited);

  store.updateAccount(
    accountId,
    {
      balance: updatedBalance,
      last_synced_at: new Date().toISOString(),
      connection_status: 'connected',
    },
    activeUserId
  );

  // 6. Audit & In-App Notification
  auditLogger.log({
    userId: activeUserId,
    eventType: 'DATA_EXPORT',
    details: `Synchronized ${newTransactions.length} new transactions for ${account.account_name} (${duplicatesCount} duplicates skipped).`,
  });

  addNotification({
    title: `🔄 ${account.provider} Synchronized`,
    body: `Successfully fetched ${newTransactions.length} new transactions. Current balance: ₹${updatedBalance.toLocaleString('en-IN')}.`,
    type: 'system',
  });

  return {
    success: true,
    newTransactionsCount: newTransactions.length,
    duplicatesSkippedCount: duplicatesCount,
    updatedBalance,
  };
}

/**
 * Disconnects an account integration while preserving past imported financial transactions.
 */
export function disconnectAccountIntegration(
  accountId: string,
  requestingUserId?: string
): boolean {
  const activeUserId = requestingUserId || store.getActiveUserId();
  const accounts = store.getAccounts(activeUserId);
  const target = accounts.find(a => a.id === accountId);
  if (!target) return false;

  store.updateAccount(accountId, { connection_status: 'disconnected' }, activeUserId);

  auditLogger.log({
    userId: activeUserId,
    eventType: 'AUTH_LOGOUT',
    details: `Disconnected integration for account ${accountId} (${target.account_name}). Future sync halted.`,
  });

  addNotification({
    title: '🔌 Account Disconnected',
    body: `${target.account_name} has been disconnected. Existing transactions remain securely saved in your local ledger.`,
    type: 'system',
  });

  return true;
}
