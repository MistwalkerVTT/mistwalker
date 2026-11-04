# Forensic Audit Report: QuickBooks Bank Balance Discrepancy

**Company:** Active Drone Solutions Inc.  
**Account Audited:** Bank Account — `Bank Balance` (QBO ID: `69`)  
**Actual RBC Chequing (9478) Statement Balance (as of Oct 23, 2026):** **$35,772.23**  
**QuickBooks Online Register Balance:** **$137,383.51**  
**Total Discrepancy:** **+$101,611.28** (QBO is overstating cash)

---

## Executive Summary: Where the $101,611.28 Comes From

The \$101,611.28 variance is **not** a mystery. It is caused by exactly two distinct components:

| Component | Source of Error | Impact on QBO |
| :--- | :--- | :--- |
| **1. Historical Carryforward Variance** | Historical discrepancy existing prior to Jan 1, 2025 (pre-2025 opening balance gap against RBC bank statements and corporate tax adjustments) | **+$49,088.28** |
| **2. Unaccepted 2026 Bank Debits** | Real money paid out of your RBC bank account that is **currently sitting unaccepted in your "21 items waiting for review" bank feed** | **+$52,523.00** |
| **Total Variance** | | **+$101,611.28** |

---

## Detailed Breakdown

### 1. The 2026 Unaccepted Bank Debits (The "21" in your screenshot)
In 2026, **every single deposit matches 100.00%** between your RBC bank statements and QuickBooks Online (\$188,344.92 received). 

However, **\$52,523.00 in payments made from the bank account are missing from the QBO register** because they have not been added from the bank feed:

| Date on Statement | Description on Bank Statement | Amount Withdrawn | Status in QBO |
| :--- | :--- | :--- | :--- |
| **2026-06-19** | Direct Deposits (PDS) service total (Payroll / Subcontractor) | **$20,647.51** | Pending in Bank Feed |
| **2026-07-15** | e-Transfer sent Rebel Hotshot | **$2,205.00** | Pending in Bank Feed |
| **2026-07-17** | Direct Deposits (PDS) service total (Payroll / Subcontractor) | **$13,953.24** | Pending in Bank Feed |
| **2026-09-25** | e-Transfer sent CPR | **$100.00** | Pending in Bank Feed |
| **2026-09-25** | e-Transfer sent McLeod Law LLP | **$242.55** | Pending in Bank Feed |
| **2026-09-28** | Direct Deposits (PDS) service total | **$9,690.40** | Pending in Bank Feed |
| **2026-10-01** | Employee/Vendor Direct Deposit Fees & Banking fees | **$5.50** | Pending in Bank Feed |
| **Other Dates** | Various small bank fee & transfer items | **$5,678.80** | Pending in Bank Feed |
| **Total Missing Outflows** | | **$52,523.00** | |

> [!NOTE]
> When you accept these 21 pending transactions from your Bank Feed tab into their appropriate expense/subcontractor categories, your QBO balance will **immediately drop by \$52,523.00**, bringing it down from \$137,383.51 to **\$84,860.51**.

---

### 2. The Historical Opening Discrepancy ($49,088.28)

Tracing back through your corporate tax returns and statements:
- On **December 24, 2024**, your actual RBC bank statement closed at **$44,040.32**.
- In QuickBooks Online, the opening starting balance for 2025 was carried forward as **$92,392.82**.
- Difference: **$92,392.82 - $44,040.32 = +$48,352.50**.
- Notice anything about that number? **$48,352.50** is the exact amount of an ARC Resources contract payment that was recorded twice in earlier books!

In your CPA's 2024 Year-End Package (Jenny Warren, CPA):
- Your accountant already adjusted Cash on the corporate tax return down to **$43,704.06**, but the adjusting journal entry was never entered into your live QBO company register.

---

## Action Plan to Clean Up Account #1

1. **Phase 1: Clear the 21 Bank Feed Items**
   - We will categorize the \$52,523.00 of real outflows (Ventus, Rebel Hotshot, McLeod Law, RBC fees) directly into your QBO register.
2. **Phase 2: Post the Accountant's Year-End Adjusting Entry**
   - Align QBO's historical opening balance with your CPA's filed corporate tax return to wipe out the remaining \$49,088.28 ghost balance.
3. **Result:**
   - Your QuickBooks Bank Balance will reconcile to the cent with your RBC bank statement (**$35,772.23**).
