import { describe, it, expect, beforeEach } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MemoryStorage();
}

import {
  parseUpiNotification,
  isSensitiveNotification,
  extractAmount,
  extractReferenceId,
  extractVpa,
  extractMerchant,
} from '../lib/upiNotificationParser';
import { upiTrackerBridge } from '../lib/upiTrackerBridge';
import { store } from '../lib/storage';

describe('Real UPI Transaction Tracking & Security Filter Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paisa_upi_tracking_enabled', 'true');
    localStorage.setItem('paisa_clean_slate_v8_enforced', 'true');
    store.initializeCleanSlate(true);
  });

  // --------------------------------------------------------------------------
  // 1. Security & Privacy Filters: OTP & Secret Drops
  // --------------------------------------------------------------------------
  describe('Security & Privacy Filters', () => {
    it('drops login OTP notifications immediately', () => {
      const otpText = 'Your OTP for PAISA login is 492810. Valid for 5 minutes. Do not share with anyone.';
      expect(isSensitiveNotification(otpText)).toBe(true);

      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Google Pay',
        text: otpText,
      });
      expect(parsed.isSensitive).toBe(true);
      expect(parsed.status).toBe('ignored_otp');
    });

    it('drops bank transaction authorization OTP notifications', () => {
      const bankOtp = 'Dear Customer, 918234 is your OTP for purchase of Rs 2,499.00 at AMAZON using Card ending 4921. OTP valid for 10 mins.';
      expect(isSensitiveNotification(bankOtp)).toBe(true);

      const parsed = parseUpiNotification({
        packageName: 'com.snapwork.hdfc',
        title: 'HDFC Bank Alert',
        text: bankOtp,
      });
      expect(parsed.isSensitive).toBe(true);
      expect(parsed.status).toBe('ignored_otp');
    });

    it('drops password reset and PIN change alerts', () => {
      const pinAlert = 'Your UPI PIN for account ending in 8112 has been changed successfully.';
      expect(isSensitiveNotification(pinAlert)).toBe(true);
      const parsed = parseUpiNotification({
        packageName: 'com.phonepe.app',
        title: 'PhonePe Security',
        text: pinAlert,
      });
      expect(parsed.isSensitive).toBe(true);
      expect(parsed.status).toBe('ignored_otp');
    });

    it('drops promotional marketing notifications', () => {
      const promoText = 'Get 50% discount up to ₹100 on your next order with code MONEY50!';
      const parsed = parseUpiNotification({
        packageName: 'com.phonepe.app',
        title: 'Exclusive Offer For You!',
        text: promoText,
      });
      expect(parsed.status).toBe('ignored_unrelated');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Parser Precision: Real UPI & Bank Notifications
  // --------------------------------------------------------------------------
  describe('Real Payment Notification Parsing', () => {
    it('parses Google Pay outgoing payment notification', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Paid to Swiggy',
        text: 'Paid ₹450.00 to Swiggy. UPI transaction ID: 429103948102',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(450);
      expect(parsed.extracted?.direction).toBe('expense');
      expect(parsed.extracted?.merchant).toBe('Swiggy');
      expect(parsed.extracted?.refId).toBe('429103948102');
    });

    it('parses Google Pay incoming payment notification', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Payment received',
        text: 'Received ₹1,500.00 from Amit Sharma amit@okaxis',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(1500);
      expect(parsed.extracted?.direction).toBe('income');
      expect(parsed.extracted?.merchant).toBe('Amit Sharma');
      expect(parsed.extracted?.vpa).toBe('amit@okaxis');
    });

    it('parses PhonePe outgoing payment notification with UTR', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.phonepe.app',
        title: 'Payment Successful',
        text: 'Payment of ₹280 to Blue Tokai Coffee was successful. UTR: 430192847192',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(280);
      expect(parsed.extracted?.direction).toBe('expense');
      expect(parsed.extracted?.merchant).toBe('Blue Tokai Coffee');
      expect(parsed.extracted?.refId).toBe('430192847192');
    });

    it('parses Paytm UPI payment notification with VPA', () => {
      const parsed = parseUpiNotification({
        packageName: 'net.one97.paytm',
        title: 'Money Sent Successfully',
        text: 'Sent Rs. 650 to Blinkit Grocery blinkit@hdfcbank. Ref 410293847102',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(650);
      expect(parsed.extracted?.direction).toBe('expense');
      expect(['Blinkit', 'Blinkit Grocery']).toContain(parsed.extracted?.merchant);
      expect(parsed.extracted?.vpa).toBe('blinkit@hdfcbank');
      expect(parsed.extracted?.refId).toBe('410293847102');
    });

    it('parses HDFC Bank debit SMS notification', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.messaging',
        title: 'VK-HDFCBK',
        text: 'A/C *4921 debited for INR 1,850.00 on 28-Oct-26 by UPI: Bescom Power Ref 491029384712. Bal: INR 45,200',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(1850);
      expect(parsed.extracted?.direction).toBe('expense');
      expect(parsed.extracted?.merchant).toBe('Bescom Power');
      expect(parsed.extracted?.refId).toBe('491029384712');
    });

    it('parses State Bank of India (SBI) credit SMS notification', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.messaging',
        title: 'VM-SBIUPI',
        text: 'Dear UPI user, A/C 8112 credited by INR 5,000.00 on 29Oct26 transfer from Rahul Verma Ref No 492019283718',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(5000);
      expect(parsed.extracted?.direction).toBe('income');
      expect(parsed.extracted?.merchant).toBe('Rahul Verma');
      expect(parsed.extracted?.refId).toBe('492019283718');
    });

    it('correctly classifies refunds as refund direction rather than income', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.phonepe.app',
        title: 'Refund Received',
        text: 'Refund of ₹350 from Swiggy has been credited to your bank account. Ref: 481920394819',
      });

      expect(parsed.status).toBe('success');
      expect(parsed.extracted?.amount).toBe(350);
      expect(parsed.extracted?.direction).toBe('refund');
      expect(parsed.extracted?.merchant).toBe('Swiggy');
    });

    it('correctly drops failed payments without recording them as spending', () => {
      const parsed = parseUpiNotification({
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Payment Failed',
        text: 'Payment of ₹920 to Zomato has failed. Money was not debited.',
      });

      expect(parsed.status).toBe('failed_transaction');
      expect(parsed.extracted?.direction).toBe('expense');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Multi-Factor Deduplication & Cross-App Pairing
  // --------------------------------------------------------------------------
  describe('Deduplication & Cross-App Pairing', () => {
    it('drops immediate duplicate notification of the same payment', () => {
      const payload = {
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Paid to Swiggy',
        text: 'Paid ₹450 to Swiggy. UTR: 429103948102',
      };

      const res1 = upiTrackerBridge.processNotification(payload);
      expect(res1.transactionCreated).toBeDefined();

      // Repeat notification within 5 seconds
      const res2 = upiTrackerBridge.processNotification(payload);
      expect(res2.transactionCreated).toBeUndefined();
      expect(res2.result.isDuplicate).toBe(true);
    });

    it('cross-app pairs UPI app notification and Bank debit SMS with same UTR', () => {
      // 1. PhonePe notification arrives
      const phonePeNotif = {
        packageName: 'com.phonepe.app',
        title: 'Payment of ₹1,200 successful',
        text: 'Paid ₹1,200 to Amazon India. UTR: 492019482910',
      };
      const res1 = upiTrackerBridge.processNotification(phonePeNotif);
      expect(res1.transactionCreated).toBeDefined();

      // 2. 15 seconds later, HDFC Bank SMS arrives for the exact same payment
      const bankSms = {
        packageName: 'com.google.android.apps.messaging',
        title: 'HDFCBK',
        text: 'A/C 4921 debited for INR 1,200.00 on 28-Oct-26 by UPI to Amazon India. Ref 492019482910.',
      };
      const res2 = upiTrackerBridge.processNotification(bankSms);
      expect(res2.transactionCreated).toBeUndefined();
      expect(res2.result.isDuplicate).toBe(true);
    });

    it('allows two separate real payments of same amount at different merchants on the same day', () => {
      // Chai at Blue Tokai
      const tx1 = upiTrackerBridge.processNotification({
        packageName: 'com.phonepe.app',
        title: 'Paid ₹250',
        text: 'Paid ₹250 to Blue Tokai Coffee. UTR: 111122223333',
      });
      expect(tx1.transactionCreated).toBeDefined();

      // Snack at Third Wave Coffee
      const tx2 = upiTrackerBridge.processNotification({
        packageName: 'com.phonepe.app',
        title: 'Paid ₹250',
        text: 'Paid ₹250 to Third Wave Coffee. UTR: 444455556666',
      });
      expect(tx2.transactionCreated).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Offline Persistence & Storage Integration
  // --------------------------------------------------------------------------
  describe('Storage & Offline Integration', () => {
    it('persists detected transactions into store and calculates spending correctly', () => {
      const initialCount = store.getTransactions().length;

      const res = upiTrackerBridge.processNotification({
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Paid to Starbucks',
        text: 'Paid ₹380 to Starbucks Coffee. Ref 592019482910',
      });

      expect(res.transactionCreated).toBeDefined();
      const afterTxs = store.getTransactions();
      expect(afterTxs.length).toBe(initialCount + 1);

      const added = afterTxs.find(t => t.id === res.transactionCreated?.id);
      expect(added).toBeDefined();
      expect(added?.amount).toBe(380);
      expect(['Starbucks', 'Starbucks Coffee']).toContain(added?.merchant);
      expect(added?.category_id).toBe('cat_food');
    });

    it('respects user disabling tracking', async () => {
      await upiTrackerBridge.setTrackingEnabled(false);
      expect(upiTrackerBridge.isTrackingEnabled()).toBe(false);

      const res = upiTrackerBridge.processNotification({
        packageName: 'com.phonepe.app',
        title: 'Paid ₹500',
        text: 'Paid ₹500 to Uber. UTR: 999988887777',
      });

      expect(res.transactionCreated).toBeUndefined();
      expect(res.result.reason).toContain('disabled');
    });
  });
});
