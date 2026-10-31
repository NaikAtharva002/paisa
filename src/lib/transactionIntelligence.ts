import { Transaction, PaymentMethod } from '../types';
import { roundPaise } from './calculations';

export type TransactionDirection = 'debit' | 'credit' | 'transfer';
export type TransactionSource = 'manual' | 'statement_import' | 'android_notification' | 'bank_sync';
export type ClassificationSource = 
  | 'user_rule' 
  | 'person_directory' 
  | 'upi_vpa' 
  | 'merchant_regex' 
  | 'banking_keyword' 
  | 'historical_pattern' 
  | 'default_fallback';

export type PersonRelationship = 
  | 'landlord'
  | 'friend'
  | 'family'
  | 'employer'
  | 'service_provider'
  | 'gym_trainer'
  | 'college_school'
  | 'grocery_merchant'
  | 'business'
  | 'custom';

export interface PersonEntity {
  id: string; // UUID
  user_id: string;
  display_name: string;
  relationship: PersonRelationship;
  default_category_id: string;
  aliases: string[]; // Variations of merchant or UPI names
  upi_vpa?: string;
  account_number_mask?: string;
  phone_number?: string;
  notes?: string;
  apply_to_historical?: boolean;
  apply_to_future?: boolean;
  total_paid_paisa?: number;
  transaction_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CategorizationAnalysis {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0.0 to 1.0
  confidenceTier: 'high' | 'medium' | 'low' | 'needs_review';
  classificationSource: ClassificationSource;
  explanation: string;
  direction: TransactionDirection;
  extractedMerchant: string;
  vpaAddress?: string;
  isCreditCardPayment: boolean;
  isInternalTransfer: boolean;
  isRefund: boolean;
  isSalary: boolean;
  isRecurringCandidate: boolean;
}

// ----------------------------------------------------------------------
// UPI VPA & Merchant Pattern Matcher
// ----------------------------------------------------------------------
const VPA_REGEX = /([a-zA-Z0-9.\-_]{2,256})@([a-zA-Z0-9.\-_]{2,64})/i;

const COMMON_VPA_MAPPINGS: Record<string, { categoryId: string; merchant: string }> = {
  swiggy: { categoryId: 'cat_food', merchant: 'Swiggy' },
  zomato: { categoryId: 'cat_food', merchant: 'Zomato' },
  blinkit: { categoryId: 'cat_groceries', merchant: 'Blinkit' },
  zepto: { categoryId: 'cat_groceries', merchant: 'Zepto' },
  instamart: { categoryId: 'cat_groceries', merchant: 'Swiggy Instamart' },
  amazon: { categoryId: 'cat_shopping', merchant: 'Amazon' },
  flipkart: { categoryId: 'cat_shopping', merchant: 'Flipkart' },
  myntra: { categoryId: 'cat_shopping', merchant: 'Myntra' },
  uber: { categoryId: 'cat_transport', merchant: 'Uber' },
  ola: { categoryId: 'cat_transport', merchant: 'Ola Cabs' },
  rapido: { categoryId: 'cat_transport', merchant: 'Rapido' },
  cred: { categoryId: 'cat_transfers', merchant: 'CRED CC Payment' },
  netflix: { categoryId: 'cat_subscriptions', merchant: 'Netflix' },
  spotify: { categoryId: 'cat_subscriptions', merchant: 'Spotify' },
  hotstar: { categoryId: 'cat_subscriptions', merchant: 'Disney+ Hotstar' },
  apollo: { categoryId: 'cat_healthcare', merchant: 'Apollo Pharmacy' },
  pharmeasy: { categoryId: 'cat_healthcare', merchant: 'PharmEasy' },
  cultfit: { categoryId: 'cat_healthcare', merchant: 'Cult.fit' },
  zerodha: { categoryId: 'cat_investments', merchant: 'Zerodha' },
  groww: { categoryId: 'cat_investments', merchant: 'Groww' },
  airtel: { categoryId: 'cat_bills', merchant: 'Airtel' },
  jio: { categoryId: 'cat_bills', merchant: 'Reliance Jio' },
  bescom: { categoryId: 'cat_bills', merchant: 'Electricity (BESCOM)' },
};

const BANK_PATTERNS: Array<{
  regex: RegExp;
  categoryId: string;
  source: ClassificationSource;
  explanation: string;
  isCredit?: boolean;
  isCC?: boolean;
  isTransfer?: boolean;
  isRefund?: boolean;
  isSalary?: boolean;
}> = [
  // Salary
  {
    regex: /(SALARY|PAYROLL|STIPEND|DIR DEP|NEFT CR.*SALARY|IMPS CR.*SALARY)/i,
    categoryId: 'cat_income',
    source: 'banking_keyword',
    explanation: 'Detected recurring corporate payroll / salary credit',
    isCredit: true,
    isSalary: true,
  },
  // Reversals & Refunds
  {
    regex: /(REFUND|REVERSAL|REV-|RTN|CHARGEBACK|CASHBACK)/i,
    categoryId: 'cat_income',
    source: 'banking_keyword',
    explanation: 'Detected transaction refund or bank chargeback credit',
    isCredit: true,
    isRefund: true,
  },
  // Credit card bill payments
  {
    regex: /(CRED|CC PAYMENT|CC BILL|HDFC CC|SBI CARD|ICICI CARD|ONECARD|AMEX)/i,
    categoryId: 'cat_transfers',
    source: 'banking_keyword',
    explanation: 'Credit card bill payment: classified as transfer to prevent double-counting expenses',
    isCC: true,
    isTransfer: true,
  },
  // Self transfers
  {
    regex: /(SELF TRANSFER|TRANSFER TO SELF|OWN ACC|SENT TO SAVINGS|SWEEP|AUTO SWEEP)/i,
    categoryId: 'cat_transfers',
    source: 'banking_keyword',
    explanation: 'Internal self-account transfer: excluded from personal spending',
    isTransfer: true,
  },
  // Groceries & Supermarkets
  {
    regex: /(BLINKIT|ZEPTO|INSTAMART|BIGBASKET|BB DAILY|DMART|D-MART|NATURE BASKET|SUPERMARKET|KIRANA|PROVISION|SPAR|RELIANCE FRESH|SPENCERS)/i,
    categoryId: 'cat_groceries',
    source: 'merchant_regex',
    explanation: 'Matched Indian grocery / quick-commerce merchant signature',
  },
  // Food & Dining
  {
    regex: /(SWIGGY|ZOMATO|MCDONALD|STARBUCKS|DOMINOS|PIZZA HUT|KFC|BURGER KING|SUBWAY|CHAI POINT|CHAAYOS|HALDIRAM|BARBEQUE NATION|RESTAURANT|CAFE|DHABA|EATCLUB|BAKERY)/i,
    categoryId: 'cat_food',
    source: 'merchant_regex',
    explanation: 'Matched restaurant, cafe, or food delivery merchant signature',
  },
  // Commute & Fuel
  {
    regex: /(UBER|OLA|RAPIDO|NAMMA YATRI|METRO|IRCTC|INDIAN RAILWAY|PETROL|FUEL|INDIAN OIL|IOCL|HPCL|BPCL|SHELL|FASTAG|TOLL|INDIGO|AIR INDIA|VISTARA)/i,
    categoryId: 'cat_transport',
    source: 'merchant_regex',
    explanation: 'Matched fuel station, ride-hailing, transit or railway booking',
  },
  // E-Commerce & Shopping
  {
    regex: /(AMAZON|FLIPKART|MYNTRA|AJIO|NYKAA|TATA CLIQ|ZARA|H&M|MEESHO|CROMA|RELIANCE DIGITAL|IKEA|DECATHLON|UNIQLO|LIFESTYLE)/i,
    categoryId: 'cat_shopping',
    source: 'merchant_regex',
    explanation: 'Matched retail e-commerce or shopping outlet signature',
  },
  // Utilities & Bills
  {
    regex: /(BESCOM|TATA POWER|ADANI|AIRTEL|JIO|VI BILL|VODAFONE|BROADBAND|ACT FIBERNET|HATHWAY|ELECTRICITY|WATER BOARD|GAS BILL|IGL|MGL)/i,
    categoryId: 'cat_bills',
    source: 'merchant_regex',
    explanation: 'Matched power, water, gas or telecom utility bill payment',
  },
  // Housing & Rent
  {
    regex: /(\bRENT\b|HOUSE RENT|FLAT RENT|LANDLORD|SOCIETY MAINT|MYGATE|NOBROKER)/i,
    categoryId: 'cat_rent',
    source: 'merchant_regex',
    explanation: 'Matched residential rent or apartment maintenance payment',
  },
  // Healthcare & Wellness
  {
    regex: /(APOLLO|PHARMEASY|1MG|NETMEDS|MEDPLUS|PRACTO|HOSPITAL|CLINIC|DENTIST|\bDR\.\s+|\bDOCTOR\b|DIAGNOSTIC|PATHOLOGY|CULT\.FIT|GYM|FITNESS)/i,
    categoryId: 'cat_healthcare',
    source: 'merchant_regex',
    explanation: 'Matched pharmacy, hospital, medical diagnostic or fitness facility',
  },
  // Investments & Trading
  {
    regex: /(ZERODHA|GROWW|INDMONEY|KUVERA|UPSTOX|ANGELONE|MUTUAL FUND|\bSIP\b|\bETF\b|COIN BY ZERODHA|\bNSE\b|\bBSE\b|\bPPF\b|\bNPS\b)/i,
    categoryId: 'cat_investments',
    source: 'merchant_regex',
    explanation: 'Matched SEBI-regulated investment platform or mutual fund SIP',
  },
  // Subscriptions & Streaming
  {
    regex: /(NETFLIX|SPOTIFY|HOTSTAR|PRIME VIDEO|DISNEY|YOUTUBE PREM|APPLE MUSIC|CHATGPT|OPENAI|GOOGLE ONE|PLAYSTATION|AUDIBLE|KINDLE)/i,
    categoryId: 'cat_subscriptions',
    source: 'merchant_regex',
    explanation: 'Matched digital recurring media or cloud SaaS subscription',
  },
  // Entertainment & Outings
  {
    regex: /(BOOKMYSHOW|PVR|INOX|CINEPOLIS|CINEMA|STEAM|GAMING|CONCERT|SMAAASH|THEATRE)/i,
    categoryId: 'cat_entertainment',
    source: 'merchant_regex',
    explanation: 'Matched movie tickets, entertainment venue or gaming platform',
  },
];

// ----------------------------------------------------------------------
// Master Transaction Classification Engine
// ----------------------------------------------------------------------
export function analyzeAndCategorizeTransaction(
  rawMerchant: string,
  rawDescription = '',
  peopleDirectory: PersonEntity[] = [],
  userRules: Array<{ keywords: string[]; categoryId: string }> = []
): CategorizationAnalysis {
  const merchantClean = (rawMerchant || '').trim();
  const descClean = (rawDescription || '').trim();
  const combined = `${merchantClean} ${descClean}`.toLowerCase();

  // Extract VPA if present
  const vpaMatch = combined.match(VPA_REGEX);
  const vpaAddress = vpaMatch ? `${vpaMatch[1]}@${vpaMatch[2]}`.toLowerCase() : undefined;

  // Determine Direction (Credit vs Debit)
  const isCreditExplicit = /(CR\b|CREDIT|RECEIVED|DEPOSIT|REFUND|REVERSAL|CASHBACK)/i.test(combined);
  const isDebitExplicit = /(DR\b|DEBIT|PAID|SENT|PURCHASE|WITHDRAWAL)/i.test(combined);
  const direction: TransactionDirection = isCreditExplicit && !isDebitExplicit ? 'credit' : 'debit';

  // 1. LAYER 1: People & Merchants Directory (Highest Priority - 100% Confidence)
  for (const person of peopleDirectory) {
    const namesToMatch = [person.display_name.toLowerCase(), ...(person.aliases || []).map(a => a.toLowerCase())];
    if (person.upi_vpa) namesToMatch.push(person.upi_vpa.toLowerCase());

    for (const name of namesToMatch) {
      if (name && combined.includes(name)) {
        return {
          categoryId: person.default_category_id,
          categoryName: person.default_category_id,
          confidence: 1.0,
          confidenceTier: 'high',
          classificationSource: 'person_directory',
          explanation: `Matched person directory: ${person.display_name} (${person.relationship})`,
          direction,
          extractedMerchant: person.display_name,
          vpaAddress,
          isCreditCardPayment: false,
          isInternalTransfer: person.relationship === 'custom' && person.default_category_id === 'cat_transfers',
          isRefund: false,
          isSalary: person.relationship === 'employer',
          isRecurringCandidate: person.relationship === 'landlord' || person.relationship === 'gym_trainer',
        };
      }
    }
  }

  // 2. LAYER 2: Explicit User-Defined Rules (98% Confidence)
  for (const rule of userRules) {
    if (rule.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return {
        categoryId: rule.categoryId,
        categoryName: rule.categoryId,
        confidence: 0.98,
        confidenceTier: 'high',
        classificationSource: 'user_rule',
        explanation: `Matched custom user categorization rule: "${rule.keywords[0]}"`,
        direction,
        extractedMerchant: merchantClean || rule.keywords[0],
        vpaAddress,
        isCreditCardPayment: rule.categoryId === 'cat_transfers',
        isInternalTransfer: rule.categoryId === 'cat_transfers',
        isRefund: false,
        isSalary: rule.categoryId === 'cat_income',
        isRecurringCandidate: false,
      };
    }
  }

  // 3. LAYER 3: UPI VPA Resolution (95% Confidence)
  if (vpaAddress) {
    for (const [prefix, mapping] of Object.entries(COMMON_VPA_MAPPINGS)) {
      if (vpaAddress.includes(prefix)) {
        return {
          categoryId: mapping.categoryId,
          categoryName: mapping.categoryId,
          confidence: 0.95,
          confidenceTier: 'high',
          classificationSource: 'upi_vpa',
          explanation: `Resolved UPI VPA handle (@${vpaAddress.split('@')[1]}) to ${mapping.merchant}`,
          direction,
          extractedMerchant: mapping.merchant,
          vpaAddress,
          isCreditCardPayment: mapping.categoryId === 'cat_transfers',
          isInternalTransfer: false,
          isRefund: false,
          isSalary: false,
          isRecurringCandidate: false,
        };
      }
    }
  }

  // 4. LAYER 4: Indian Merchant Regex & Banking Channel Patterns (90% Confidence)
  for (const pattern of BANK_PATTERNS) {
    if (pattern.regex.test(combined)) {
      const isHighConfidence = pattern.regex.test(merchantClean) || pattern.isSalary || pattern.isRefund;
      const score = isHighConfidence ? 0.90 : 0.80;

      return {
        categoryId: pattern.categoryId,
        categoryName: pattern.categoryId,
        confidence: score,
        confidenceTier: score >= 0.85 ? 'high' : 'medium',
        classificationSource: pattern.source,
        explanation: pattern.explanation,
        direction: pattern.isCredit ? 'credit' : direction,
        extractedMerchant: merchantClean || 'Merchant',
        vpaAddress,
        isCreditCardPayment: !!pattern.isCC,
        isInternalTransfer: !!pattern.isTransfer,
        isRefund: !!pattern.isRefund,
        isSalary: !!pattern.isSalary,
        isRecurringCandidate: !!pattern.isSalary || pattern.categoryId === 'cat_rent' || pattern.categoryId === 'cat_subscriptions',
      };
    }
  }

  // 5. LAYER 5: Fallback to "Other" with explicit 'needs_review' (20% Confidence)
  return {
    categoryId: 'cat_other',
    categoryName: 'Other',
    confidence: 0.20,
    confidenceTier: 'needs_review',
    classificationSource: 'default_fallback',
    explanation: 'Could not match known merchant, UPI VPA, or bank pattern. Tagged for user review.',
    direction,
    extractedMerchant: merchantClean || 'Uncategorized Expense',
    vpaAddress,
    isCreditCardPayment: false,
    isInternalTransfer: false,
    isRefund: false,
    isSalary: false,
    isRecurringCandidate: false,
  };
}

// ----------------------------------------------------------------------
// Time-Based & Multi-Year Financial Analysis Engine
// ----------------------------------------------------------------------
export interface FinancialAnalysisReport {
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalRecords: number;
  
  // Invariant Totals (Integer Paise & Rupee Convenience)
  totalIncomePaise: number;
  totalExpensePaise: number;
  netCashFlowPaise: number;
  totalIncomeRupees: number;
  totalExpenseRupees: number;
  netSavingsRupees: number;
  transfersTotalPaise: number;
  transfersCount: number;

  // Averages
  dailyAverageExpensePaise: number;
  weeklyAverageExpensePaise: number;
  monthlyAverageExpensePaise: number;

  // Highlights
  highestSpendingDay?: { date: string; amountPaise: number; merchant: string };
  highestSpendingCategory?: { categoryId: string; amountPaise: number; percentage: number };
  topMerchants: Array<{ merchant: string; amountPaise: number; count: number }>;
  categoryBreakdown: Record<string, number>; // categoryId -> amount in paise
  
  // Recurring subscriptions detected
  recurringDetected: Array<{ merchant: string; amountPaise: number; frequency: string; count: number }>;
}

export function generateFinancialIntelligenceReport(
  transactions: Transaction[],
  filterRange?: { start?: string; end?: string; label?: string }
): FinancialAnalysisReport {
  // If zero transactions exist, return pure clean slate at absolute zero
  if (!transactions || transactions.length === 0) {
    return {
      dateRangeLabel: filterRange?.label || 'No transactions recorded',
      startDate: filterRange?.start || '',
      endDate: filterRange?.end || '',
      totalDays: 0,
      totalRecords: 0,
      totalIncomePaise: 0,
      totalExpensePaise: 0,
      netCashFlowPaise: 0,
      totalIncomeRupees: 0,
      totalExpenseRupees: 0,
      netSavingsRupees: 0,
      transfersTotalPaise: 0,
      transfersCount: 0,
      dailyAverageExpensePaise: 0,
      weeklyAverageExpensePaise: 0,
      monthlyAverageExpensePaise: 0,
      topMerchants: [],
      categoryBreakdown: {},
      recurringDetected: [],
    };
  }

  // Filter transactions within range
  let filtered = transactions;
  if (filterRange?.start) {
    filtered = filtered.filter(t => t.transaction_date >= filterRange.start!);
  }
  if (filterRange?.end) {
    filtered = filtered.filter(t => t.transaction_date <= filterRange.end!);
  }

  // Sort chronologically
  filtered = [...filtered].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  const startDate = filtered.length > 0 ? filtered[0].transaction_date.slice(0, 10) : '';
  const endDate = filtered.length > 0 ? filtered[filtered.length - 1].transaction_date.slice(0, 10) : '';
  
  const startMs = startDate ? new Date(startDate).getTime() : Date.now();
  const endMs = endDate ? new Date(endDate).getTime() : Date.now();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;
  let transfersTotalPaise = 0;
  let transfersCount = 0;

  const categoryBreakdown: Record<string, number> = {};
  const merchantMap: Map<string, { amount: number; count: number }> = new Map();
  const daySpendMap: Map<string, { amount: number; merchant: string }> = new Map();

  for (const t of filtered) {
    const amountPaise = Math.round(Math.abs(t.amount) * 100);

    // Internal transfers / Credit Card settlements are isolated
    if (t.is_internal_transfer || t.is_credit_card_payment || t.category_id === 'cat_transfers') {
      transfersTotalPaise += amountPaise;
      transfersCount++;
      continue; // Exclude from spending & income
    }

    if (t.transaction_type === 'income') {
      totalIncomePaise += amountPaise;
    } else {
      totalExpensePaise += amountPaise;

      // Category aggregation
      const catId = t.category_id || 'cat_other';
      categoryBreakdown[catId] = (categoryBreakdown[catId] || 0) + amountPaise;

      // Merchant aggregation
      const mName = (t.merchant || 'Unknown').trim();
      const existingM = merchantMap.get(mName) || { amount: 0, count: 0 };
      merchantMap.set(mName, { amount: existingM.amount + amountPaise, count: existingM.count + 1 });

      // Daily spending peak
      const day = t.transaction_date.slice(0, 10);
      const existingDay = daySpendMap.get(day) || { amount: 0, merchant: mName };
      daySpendMap.set(day, { amount: existingDay.amount + amountPaise, merchant: mName });
    }
  }

  const netCashFlowPaise = totalIncomePaise - totalExpensePaise;
  const dailyAverageExpensePaise = roundPaise(totalExpensePaise / totalDays);
  const weeklyAverageExpensePaise = roundPaise(dailyAverageExpensePaise * 7);
  const monthlyAverageExpensePaise = roundPaise(dailyAverageExpensePaise * 30.4);

  // Highest spending day
  let highestSpendingDay: { date: string; amountPaise: number; merchant: string } | undefined;
  for (const [day, data] of daySpendMap.entries()) {
    if (!highestSpendingDay || data.amount > highestSpendingDay.amountPaise) {
      highestSpendingDay = { date: day, amountPaise: data.amount, merchant: data.merchant };
    }
  }

  // Top merchants
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, d]) => ({ merchant, amountPaise: d.amount, count: d.count }))
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 5);

  // Recurring detection (same merchant and same amount across 2+ distinct dates)
  const recurringMap: Map<string, { merchant: string; amountPaise: number; dates: Set<string> }> = new Map();
  for (const t of filtered) {
    if (t.transaction_type === 'expense' && !t.is_internal_transfer) {
      const key = `${t.merchant.toLowerCase()}_${t.amount}`;
      const existing = recurringMap.get(key) || { merchant: t.merchant, amountPaise: t.amount, dates: new Set() };
      existing.dates.add(t.transaction_date.slice(0, 10));
      recurringMap.set(key, existing);
    }
  }

  const recurringDetected = Array.from(recurringMap.values())
    .filter(r => r.dates.size >= 2)
    .map(r => ({
      merchant: r.merchant,
      amountPaise: r.amountPaise,
      frequency: r.dates.size >= 4 ? 'Weekly / Frequent' : 'Monthly recurring',
      count: r.dates.size,
    }))
    .slice(0, 5);

  return {
    dateRangeLabel: filterRange?.label || `Covering ${startDate} to ${endDate} (${totalDays} days)`,
    startDate,
    endDate,
    totalDays,
    totalRecords: filtered.length,
    totalIncomePaise,
    totalExpensePaise,
    netCashFlowPaise,
    totalIncomeRupees: roundPaise(totalIncomePaise / 100),
    totalExpenseRupees: roundPaise(totalExpensePaise / 100),
    netSavingsRupees: roundPaise(netCashFlowPaise / 100),
    transfersTotalPaise,
    transfersCount,
    dailyAverageExpensePaise,
    weeklyAverageExpensePaise,
    monthlyAverageExpensePaise,
    highestSpendingDay,
    topMerchants,
    categoryBreakdown,
    recurringDetected,
  };
}

// ----------------------------------------------------------------------
// Natural-Language Financial Q&A Respondent (Deterministic)
// ----------------------------------------------------------------------
export interface NLQueryResult {
  question: string;
  answerText: string;
  calculatedValuePaise?: number;
  calculatedFormatted?: string;
  matchedCategory?: string;
  matchedMerchant?: string;
  recordsCount: number;
  confidence: number;
}

export function answerFinancialQuestion(
  question: string,
  transactions: Transaction[]
): NLQueryResult {
  const q = question.toLowerCase().trim();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Food / Dining spending
  if (q.includes('food') || q.includes('dining') || q.includes('swiggy') || q.includes('zomato')) {
    const matching = transactions.filter(
      t => (t.category_id === 'cat_food' || t.category_id === 'cat_groceries') &&
           t.transaction_type === 'expense'
    );
    const total = matching.reduce((sum, t) => sum + t.amount, 0);
    if (matching.length === 0) {
      return {
        question,
        answerText: `No transactions found matching "${question}". You have not recorded any food & dining expenses.`,
        calculatedValuePaise: 0,
        calculatedFormatted: '₹0.00',
        recordsCount: 0,
        confidence: 1.0,
      };
    }
    return {
      question,
      answerText: `You spent ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${matching.length} transactions on Food & Dining.`,
      calculatedValuePaise: Math.round(total * 100),
      calculatedFormatted: `₹${total.toFixed(2)}`,
      matchedCategory: 'Food & Dining',
      recordsCount: matching.length,
      confidence: 0.95,
    };
  }

  // 2. Spending today
  if (q.includes('today') || q.includes('spent today')) {
    const matching = transactions.filter(
      t => t.transaction_date.slice(0, 10) === todayStr && t.transaction_type === 'expense' && !t.is_internal_transfer
    );
    const total = matching.reduce((sum, t) => sum + t.amount, 0);
    return {
      question,
      answerText: `You spent ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${matching.length} transaction(s) today.`,
      calculatedValuePaise: Math.round(total * 100),
      calculatedFormatted: `₹${total.toFixed(2)}`,
      recordsCount: matching.length,
      confidence: 0.95,
    };
  }

  // 3. Highest spending day
  if (q.includes('highest') && (q.includes('day') || q.includes('date'))) {
    const report = generateFinancialIntelligenceReport(transactions);
    if (report.highestSpendingDay) {
      return {
        question,
        answerText: `Your highest spending day was ${report.highestSpendingDay.date} with ₹${(report.highestSpendingDay.amountPaise / 100).toLocaleString('en-IN')} spent (including ${report.highestSpendingDay.merchant}).`,
        calculatedValuePaise: report.highestSpendingDay.amountPaise,
        calculatedFormatted: `₹${(report.highestSpendingDay.amountPaise / 100).toFixed(2)}`,
        recordsCount: report.totalRecords,
        confidence: 0.95,
      };
    }
  }

  // 4. Subscriptions spending
  if (q.includes('subscription') || q.includes('netflix') || q.includes('spotify')) {
    const matching = transactions.filter(
      t => t.category_id === 'cat_subscriptions' && t.transaction_type === 'expense'
    );
    const total = matching.reduce((sum, t) => sum + t.amount, 0);
    if (matching.length === 0) {
      return {
        question,
        answerText: `No transactions found matching "${question}". You have not recorded any subscription expenses.`,
        calculatedValuePaise: 0,
        calculatedFormatted: '₹0.00',
        recordsCount: 0,
        confidence: 1.0,
      };
    }
    return {
      question,
      answerText: `You have spent ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} on digital subscriptions across ${matching.length} payments.`,
      calculatedValuePaise: Math.round(total * 100),
      calculatedFormatted: `₹${total.toFixed(2)}`,
      matchedCategory: 'Subscriptions',
      recordsCount: matching.length,
      confidence: 0.90,
    };
  }

  // 5. Total Income
  if (q.includes('income') || q.includes('earn') || q.includes('received')) {
    const matching = transactions.filter(t => t.transaction_type === 'income');
    const total = matching.reduce((sum, t) => sum + t.amount, 0);
    return {
      question,
      answerText: `Your total recorded income is ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} from ${matching.length} deposit(s).`,
      calculatedValuePaise: Math.round(total * 100),
      calculatedFormatted: `₹${total.toFixed(2)}`,
      recordsCount: matching.length,
      confidence: 0.95,
    };
  }

  // 6. Generic Category Search (Travel, Shopping, Rent, etc.)
  const categoryKeywords: Record<string, string> = {
    travel: 'cat_travel',
    shopping: 'cat_shopping',
    rent: 'cat_rent',
    bills: 'cat_bills',
    healthcare: 'cat_healthcare',
    entertainment: 'cat_entertainment',
  };
  for (const [kw, catId] of Object.entries(categoryKeywords)) {
    if (q.includes(kw)) {
      const matching = transactions.filter(t => t.category_id === catId && t.transaction_type === 'expense');
      const total = matching.reduce((sum, t) => sum + t.amount, 0);
      if (matching.length === 0) {
        return {
          question,
          answerText: `No transactions found matching "${question}". You have zero recorded spending in this category.`,
          calculatedValuePaise: 0,
          calculatedFormatted: '₹0.00',
          recordsCount: 0,
          confidence: 1.0,
        };
      }
      return {
        question,
        answerText: `You spent ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${matching.length} transactions on ${kw}.`,
        calculatedValuePaise: Math.round(total * 100),
        calculatedFormatted: `₹${total.toFixed(2)}`,
        recordsCount: matching.length,
        confidence: 0.90,
      };
    }
  }

  // Fallback Summary
  const report = generateFinancialIntelligenceReport(transactions);
  return {
    question,
    answerText: `In the recorded history, your total expenses are ₹${(report.totalExpensePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} and total income is ₹${(report.totalIncomePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}, giving a net balance of ₹${(report.netCashFlowPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
    calculatedValuePaise: report.netCashFlowPaise,
    calculatedFormatted: `₹${(report.netCashFlowPaise / 100).toFixed(2)}`,
    recordsCount: transactions.length,
    confidence: 0.80,
  };
}
