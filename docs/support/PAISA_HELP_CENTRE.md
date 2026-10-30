# PAISA — CUSTOMER SUPPORT MANUAL & HELP CENTRE

**Document Version:** 1.0  
**Effective Date:** October 31, 2026  
**Audience:** PAISA Users & Customer Support Representatives  

---

## 1. GETTING STARTED & ACCOUNT CREATION GUIDE

### 1.1 First-Time Setup in 3 Minutes
1. Visit `https://paisa.money` and click **"Start Your Daily Reality Check"** or **"Get Started Free"**.
2. **Step 1: Your Name & Profile:** Enter your preferred display name (how PAISA will greet you).
3. **Step 2: Monthly Income Cycle:** Enter your monthly take-home salary (post-tax) and the day of the month your salary is credited (e.g., 1st, 5th, or last working day).
4. **Step 3: Fixed Commitments:** Enter your recurring monthly essentials (rent, loan EMIs, child tuition). PAISA subtracts these from your salary to find your actual disposable income.
5. **Step 4: Your Daily Reality Check is Ready!** PAISA calculates your daily spending allowance:
   $$\text{Daily Allowance} = \frac{\text{Disposable Income} - \text{Month-to-Date Spending}}{\text{Days Remaining in Month}}$$

---

## 2. DAILY EXPENSE & INCOME TRACKING GUIDE

### 2.1 Logging an Expense
- Click the **"+ Add Expense"** button in the header or bottom navigation bar.
- Enter the amount in Rupees.
- Choose a category (e.g. *Food & Dining*, *Groceries*, *Shopping*, *Transport*, *Entertainment*, *Bills & Utilities*).
- Optionally specify the merchant (e.g. *Swiggy*, *Blinkit*, *Uber*).
- Click **"Save Expense"**. Your daily allowance updates instantaneously.

### 2.2 Logging Income & Refunds
- In the Transaction form, toggle to the **"Income"** tab.
- Enter the amount and select the source (Salary, Freelance, Investment, or Refund).
- Refunds reduce your net monthly expenses without dropping below zero.

---

## 3. BANK STATEMENT IMPORT GUIDE

PAISA allows you to import past bank statements without sharing your NetBanking credentials:
1. Log into your bank's website or app (SBI, HDFC, ICICI, Axis, Kotak).
2. Download your account statement for the past 30–90 days as a **CSV** or **JSON** file.
3. In PAISA, go to the **Transactions** tab and click **"Import Statement"**.
4. Drag and drop your file. PAISA parses the statement locally on your device.
5. Review the preview table: duplicate transactions previously logged are automatically flagged.
6. Click **"Confirm Import"**. If you make a mistake, click **"Rollback Import"** to delete all imported records in one click.

---

## 4. BUDGET MANAGEMENT & SPENDING LIMITS GUIDE

1. Open the **Budgets** tab.
2. Toggle between **Monthly** and **Annual** views.
3. For each category, see your current spend vs your allocated limit.
4. Circular gauges turn from green (within budget) to amber (approaching 80%) to red (over budget).
5. To change a limit or disable a budget, click on the category and enter the new amount (or enter `₹0` to reset).

---

## 5. SAVINGS GOALS WITH CONFETTI TRACKING

1. Open the **Goals** tab.
2. Click **"+ New Savings Goal"**.
3. Name your goal (e.g. *"New Laptop"*, *"Emergency Fund"*, *"Japan Trip"*).
4. Enter your target amount and target date.
5. As you save, click **"+ Add Deposit"**. When your goal reaches 100%, PAISA celebrates your milestone with on-screen confetti.

---

## 6. DATA PORTABILITY & FULL ACCOUNT DELETION

### 6.1 Downloading a Full Backup
- Go to **Settings** $\to$ **Data Portability**.
- Click **"Export Full Financial Backup"**.
- A `.json` file containing all transactions, budgets, goals, and settings will download to your device. Keep this safe.

### 6.2 Instant Account Erasure ("Right to Be Forgotten")
- Go to **Settings** $\to$ **Danger Zone**.
- Click **"Reset All Financial Data / Erase Everything"**.
- Confirm the dialog. All local records, keys, and session credentials are permanently wiped from your browser.

---

## 7. TROUBLESHOOTING & COMMON RESOLUTIONS

| Problem | Cause | How to Fix |
|---|---|---|
| **My daily allowance seems too low or negative.** | Month-to-date spending has exceeded your disposable income for this month. | Check your fixed commitments in Settings, or add any unexpected income / bonuses in the Transactions screen. |
| **I cleared my browser cache and my data disappeared.** | In default offline mode, data lives in browser storage. | Click **Settings $\to$ Restore From Backup** and select your previously exported `.json` backup file. |
| **Statement import says "Unrecognized Format".** | The uploaded CSV file has non-standard header names. | Ensure the CSV contains columns for Date, Amount/Debit, and Description. You can open the file in Excel or Google Sheets and re-export as a standard CSV. |
| **Account locked: "Too many failed attempts".** | 5 consecutive wrong passwords were entered. | Wait 5 minutes for the security rate-limiting timer to automatically expire, then re-enter your master password. |

---

## 8. CONTACTING CUSTOMER SUPPORT

- **Official Support Email:** [SUPPORT EMAIL ADDRESS, e.g., support@paisa.money]
- **In-App Feedback:** Open the public footer or Settings $\to$ Contact Support.
- **Support Hours:** Monday to Friday, 9:00 AM – 6:00 PM IST.
- **Standard Response Time:** Within 24–48 business hours.
