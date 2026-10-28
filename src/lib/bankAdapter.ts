import { Account, BankConsent, Transaction } from '../types';

/**
 * Account Aggregator (AA) India Architecture Specification
 * --------------------------------------------------------
 * Paisa acts as a Financial Information User (FIU) under RBI regulations.
 * In production:
 * 1. FIU requests Consent Artifact from RBI-licensed AA (e.g., Setu AA / Finvu / OneMoney).
 * 2. User is redirected to AA Consent Manager UI (or opens AA app) with an encrypted session.
 * 3. User selects their bank accounts (Financial Information Providers - FIPs) and authenticates using AA OTP.
 * 4. User reviews explicit consent terms:
 *    - Purpose: Personal Finance Management (PFM)
 *    - Data Fetch Frequency: Daily or on-demand
 *    - Consent Validity: Typically 1 year
 *    - Data Range: Last 90 days or custom
 * 5. AA delivers digitally signed Financial Information Data Session to Paisa server.
 * 6. Paisa server decrypts data using private RSA/ECDH keys and generates normalized transactions.
 *
 * SAFETY GUARANTEES:
 * - NO bank passwords, UPI PINs, or debit card CVVs are EVER collected or handled.
 * - Screen-scraping and SMS sniffing are strictly rejected in favor of end-to-end encrypted AA pipes.
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
  status: 'INITIATED' | 'PENDING_USER_APPROVAL' | 'ACTIVE' | 'FAILED';
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
 * Simulates the RBI Account Aggregator consent process for development and interactive evaluation.
 * Note: Clearly labeled as Demo / Sandbox in the interface.
 */
export async function simulateAaConsentFlow(params: ConsentRequestParams): Promise<ConsentResult> {
  // Artificial latency to mirror network handshakes
  await new Promise(resolve => setTimeout(resolve, 800));

  const consentId = `SETU-AA-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  // Simulated discovered accounts based on selected FIPs
  const accountsDiscovered: ConsentResult['accountsDiscovered'] = [];

  if (params.selectedFips.includes('HDFC') || params.selectedFips.length === 0) {
    accountsDiscovered.push({
      fipName: 'HDFC Bank',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 74200,
    });
  }

  if (params.selectedFips.includes('ICICI') || params.selectedFips.length === 0) {
    accountsDiscovered.push({
      fipName: 'ICICI Bank',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 145000,
    });
  }

  if (params.selectedFips.includes('SBI')) {
    accountsDiscovered.push({
      fipName: 'State Bank of India',
      accountType: 'savings',
      maskedAccNumber: '••' + Math.floor(1000 + Math.random() * 9000),
      balance: 32400,
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
export function generateSimulatedBankFeed(account: Account, count = 3): Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[] {
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
    transaction_date: new Date(now.getTime() - i * 3600000).toISOString(),
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
