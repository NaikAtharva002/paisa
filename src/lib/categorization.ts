import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food & Dining', icon: 'Utensils', color: '#F97316', category_type: 'expense', is_default: true },
  { id: 'cat_groceries', name: 'Groceries', icon: 'ShoppingBag', color: '#10B981', category_type: 'expense', is_default: true },
  { id: 'cat_shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', category_type: 'expense', is_default: true },
  { id: 'cat_transport', name: 'Transport', icon: 'Car', color: '#3B82F6', category_type: 'expense', is_default: true },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: 'Zap', color: '#8B5CF6', category_type: 'expense', is_default: true },
  { id: 'cat_rent', name: 'Rent', icon: 'Home', color: '#6366F1', category_type: 'expense', is_default: true },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'Film', color: '#E11D48', category_type: 'expense', is_default: true },
  { id: 'cat_subscriptions', name: 'Subscriptions', icon: 'Tv', color: '#06B6D4', category_type: 'expense', is_default: true },
  { id: 'cat_healthcare', name: 'Healthcare', icon: 'Activity', color: '#14B8A6', category_type: 'expense', is_default: true },
  { id: 'cat_education', name: 'Education', icon: 'BookOpen', color: '#F59E0B', category_type: 'expense', is_default: true },
  { id: 'cat_travel', name: 'Travel', icon: 'Plane', color: '#0EA5E9', category_type: 'expense', is_default: true },
  { id: 'cat_personal_care', name: 'Personal Care', icon: 'Smile', color: '#D946EF', category_type: 'expense', is_default: true },
  { id: 'cat_transfers', name: 'Transfers', icon: 'ArrowLeftRight', color: '#64748B', category_type: 'transfer', is_default: true },
  { id: 'cat_investments', name: 'Investments', icon: 'TrendingUp', color: '#059669', category_type: 'investment', is_default: true },
  { id: 'cat_savings', name: 'Savings', icon: 'PiggyBank', color: '#16A34A', category_type: 'savings', is_default: true },
  { id: 'cat_other', name: 'Other', icon: 'MoreHorizontal', color: '#94A3B8', category_type: 'expense', is_default: true },
];

export interface CategorizationResult {
  categoryId: string;
  isCreditCardPayment: boolean;
  isInternalTransfer: boolean;
  confidence: number;
  matchedRule?: string;
  notes?: string;
}

interface MerchantRule {
  keywords: string[];
  categoryId: string;
  isCreditCardPayment?: boolean;
  isInternalTransfer?: boolean;
}

export const MERCHANT_RULES: MerchantRule[] = [
  // Credit card payments / Settlements (Prevent double counting!)
  {
    keywords: ['cred', 'credit card payment', 'cc bill', 'hdfc cc pay', 'sbi card payment', 'icici credit card', 'onecard payment', 'amex payment'],
    categoryId: 'cat_transfers',
    isCreditCardPayment: true,
  },
  // Internal transfers
  {
    keywords: ['transfer to self', 'self transfer', 'own account', 'imps self', 'neft self', 'sent to savings'],
    categoryId: 'cat_transfers',
    isInternalTransfer: true,
  },
  // Food & dining
  {
    keywords: ['swiggy', 'zomato', 'mcdonald', 'starbucks', 'chai point', 'dominos', 'kfc', 'eatclub', 'burger king', 'subway', 'haldiram', 'barbeque nation', 'cafe', 'restaurant', 'dhaba'],
    categoryId: 'cat_food',
  },
  // Groceries & Quick Commerce
  {
    keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'bb daily', 'dmart', 'd-mart', 'nature basket', 'supermarket', 'kirana', 'vegetables', 'fruits'],
    categoryId: 'cat_groceries',
  },
  // Shopping
  {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tata cliq', 'zara', 'h&m', 'meesho', 'croma', 'reliance digital', 'ikea', 'decathlon'],
    categoryId: 'cat_shopping',
  },
  // Transport & Commute
  {
    keywords: ['uber', 'ola', 'rapido', 'namma yatri', 'metro', 'irctc', 'petrol', 'fuel', 'indian oil', 'hpcl', 'bpcl', 'shell', 'fastag', 'toll'],
    categoryId: 'cat_transport',
  },
  // Subscriptions
  {
    keywords: ['netflix', 'spotify', 'hotstar', 'prime video', 'disney', 'youtube premium', 'apple music', 'chatgpt', 'google one', 'playstation', 'audible'],
    categoryId: 'cat_subscriptions',
  },
  // Entertainment
  {
    keywords: ['bookmyshow', 'pvr', 'inox', 'cinepolis', 'gaming', 'steam', 'smaaash', 'concert'],
    categoryId: 'cat_entertainment',
  },
  // Bills & Utilities
  {
    keywords: ['bescom', 'tata power', 'adani electric', 'airtel', 'jio', 'vi bill', 'broadband', 'act fibernet', 'gas bill', 'water bill', 'electricity'],
    categoryId: 'cat_bills',
  },
  // Healthcare
  {
    keywords: ['apollo', 'pharmeasy', '1mg', 'practo', 'hospital', 'medplus', 'clinic', 'dentist', 'dr ', 'diagnostic', 'pathology'],
    categoryId: 'cat_healthcare',
  },
  // Rent
  {
    keywords: ['nobroker', 'house rent', 'flat rent', 'landlord', 'society maintenance'],
    categoryId: 'cat_rent',
  },
  // Investments
  {
    keywords: ['zerodha', 'groww', 'indmoney', 'kuvera', 'upstox', 'angelone', 'mutual fund', 'sip', 'etf', 'coin by zerodha'],
    categoryId: 'cat_investments',
  },
];

/**
 * Automatically predicts the appropriate category for a given merchant name or transaction description.
 */
export function suggestCategory(
  merchant: string,
  description = '',
  customRules: MerchantRule[] = []
): CategorizationResult {
  const combined = `${merchant.toLowerCase()} ${description.toLowerCase()}`.trim();

  // 1. Check custom user rules first
  for (const rule of customRules) {
    if (rule.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return {
        categoryId: rule.categoryId,
        isCreditCardPayment: !!rule.isCreditCardPayment,
        isInternalTransfer: !!rule.isInternalTransfer,
        confidence: 0.95,
        matchedRule: rule.keywords[0],
      };
    }
  }

  // 2. Check built-in Indian merchant dictionary
  for (const rule of MERCHANT_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        return {
          categoryId: rule.categoryId,
          isCreditCardPayment: !!rule.isCreditCardPayment,
          isInternalTransfer: !!rule.isInternalTransfer,
          confidence: 0.9,
          matchedRule: kw,
          notes: rule.isCreditCardPayment 
            ? 'Identified as Credit Card Bill Payment: excluded from daily spending to avoid double counting purchases.'
            : undefined,
        };
      }
    }
  }

  // Fallback to "Other"
  return {
    categoryId: 'cat_other',
    isCreditCardPayment: false,
    isInternalTransfer: false,
    confidence: 0.3,
  };
}
