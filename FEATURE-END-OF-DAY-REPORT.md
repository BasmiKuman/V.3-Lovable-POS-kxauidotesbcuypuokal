# 🎯 Feature: End-of-Day Stock Report (v1.2.0)

## 📋 Overview

**Problem:** Rider pulang, kita hitung manual sisa stok untuk laporan pembukuan.  
**Solution:** Admin input sisa stok → System auto-calculate penjualan → Auto-generate adjustment transaction → Generate laporan.

**Approval:** ✅ AUTO-APPROVAL (No manual review needed)
**Status:** 🚧 IN DEVELOPMENT (Branch: `feature/end-of-day-stock-report`)

---

## 🎨 Feature Design

### User Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    MORNING (Distribution)                    │
├─────────────────────────────────────────────────────────────┤
│  Admin: Distribute 50 Kopi Joo to Zulfian                   │
│  System: rider_stock updated                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DAYTIME (Selling)                         │
├─────────────────────────────────────────────────────────────┤
│  Zulfian: Use POS to record sales (QRIS/Tunai)              │
│  System: transactions + transaction_items created            │
│  Status: 20 transactions recorded, 35 cups sold in POS       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EVENING (End of Day)                        │
├─────────────────────────────────────────────────────────────┤
│  Zulfian: Returns with remaining stock                       │
│  Admin: Input "Sisa: 8 cups Kopi Joo" → Click Submit        │
│  System (AUTO-APPROVAL):                                     │
│    - Calculate: 50 - 8 = 42 cups sold (actual)              │
│    - POS recorded: 35 cups                                   │
│    - Missing: 42 - 35 = 7 cups (adjustment needed)          │
│    - AUTO-GENERATE adjustment transaction for 7 cups ✅      │
│    - Update final report (status: submitted)                │
│    - No manual approval needed!                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      REPORTS                                 │
├─────────────────────────────────────────────────────────────┤
│  Daily Report:                                               │
│    - Total Sold: 42 cups ✅                                  │
│    - POS Transactions: 35 cups (QRIS: 20, Tunai: 15)        │
│    - Stock Adjustment: 7 cups (unrecorded)                   │
│    - Revenue: Calculated from all sources                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### New Tables:

#### 1. `end_of_day_reports`
```sql
CREATE TABLE end_of_day_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES auth.users(id),
  report_date DATE NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id), -- Admin who input
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(rider_id, report_date)
);
```

#### 2. `end_of_day_items`
```sql
CREATE TABLE end_of_day_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES end_of_day_reports(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  distributed_quantity INTEGER NOT NULL, -- From distribution
  remaining_quantity INTEGER NOT NULL, -- Input by admin
  sold_quantity INTEGER NOT NULL, -- Calculated: distributed - remaining
  pos_quantity INTEGER NOT NULL DEFAULT 0, -- From POS transactions
  adjustment_quantity INTEGER NOT NULL DEFAULT 0, -- sold - pos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 3. `stock_adjustments` (Optional - for audit trail)
```sql
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES end_of_day_reports(id),
  transaction_id UUID REFERENCES transactions(id), -- Generated adjustment transaction
  rider_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  reason TEXT DEFAULT 'End of Day Stock Count',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 🎨 UI Design

### Location: Warehouse Tab → New "Laporan Akhir Hari" Section

```
┌──────────────────────────────────────────────────────────────────┐
│  📦 WAREHOUSE                                                     │
├──────────────────────────────────────────────────────────────────┤
│  [Distribution] [Returns] [Rejects] [📋 Laporan Akhir Hari] ← NEW│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  📋 Laporan Akhir Hari                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📅 Tanggal: [2025-12-11 ▼]    👤 Rider: [Zulfian ▼]            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Ringkasan Distribusi & POS Hari Ini                        │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Total Distribusi: 50 cups                                  │  │
│  │ POS Tercatat: 35 cups (20 QRIS, 15 Tunai)                 │  │
│  │ Status: Menunggu input sisa stok                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Input Sisa Stok                                            │  │
│  ├─────────┬─────────┬─────────┬─────────┬────────┬──────────┤  │
│  │ Produk  │ Distrib │ POS     │ Sisa    │ Terjual│ Selisih  │  │
│  ├─────────┼─────────┼─────────┼─────────┼────────┼──────────┤  │
│  │ Kopi    │   20    │   14    │  [6]    │   14   │    0     │  │
│  │ Choco   │   15    │   10    │  [3]    │   12   │   +2 ⚠️  │  │
│  │ Matcha  │   10    │    8    │  [1]    │    9   │   +1 ⚠️  │  │
│  │ Taro    │    5    │    3    │  [2]    │    3   │    0     │  │
│  └─────────┴─────────┴─────────┴─────────┴────────┴──────────┘  │
│                                                                   │
│  ⚠️ Selisih Detected: 3 cups tidak tercatat di POS               │
│  System akan generate adjustment transaction untuk selisih.      │
│                                                                   │
│  📝 Catatan: [Optional notes...]                                 │
│                                                                   │
│  [💾 Simpan Draft] [✅ Submit Laporan] [🔄 Reset]                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Riwayat Laporan Akhir Hari                                      │
├──────────────────────────────────────────────────────────────────┤
│  [Table: Date | Rider | Total Sold | POS | Adjustment | Status] │
│  Status: draft (editing) | submitted (final, adjustment created) │
│  Note: No manual approval needed - Auto-generate on submit! ✅   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup ✅
- [x] Create branch
- [ ] Create SQL migration for new tables
- [ ] Setup RLS policies
- [ ] Add indexes for performance

### Phase 2: Backend Logic
- [ ] Add Supabase types generation
- [ ] Create utility functions:
  - `calculateDistributed()` - Get distribution for rider/date
  - `calculatePOSSales()` - Get POS transactions for rider/date
  - `calculateAdjustment()` - Calculate difference
  - `generateAdjustmentTransaction()` - Create adjustment transaction

### Phase 3: UI Components
- [ ] Create `EndOfDayTab.tsx`
- [ ] Create `EndOfDayForm.tsx`
- [ ] Create `EndOfDayItemRow.tsx`
- [ ] Create `EndOfDayHistory.tsx`
- [ ] Add tab to Warehouse page

### Phase 4: Integration
- [ ] Connect to existing reports
- [ ] Update daily/monthly report calculations
- [ ] Add reconciliation view
- [ ] Add export functionality

### Phase 5: Testing
- [ ] Unit tests for calculations
- [ ] Integration tests
- [ ] Manual testing with real data
- [ ] Performance testing

### Phase 6: Documentation
- [ ] User guide for admin
- [ ] Technical documentation
- [ ] Migration guide

---

## 🎯 Success Criteria

- ✅ Admin can input remaining stock per rider per day
- ✅ System calculates sold quantity automatically
- ✅ **AUTO-APPROVAL:** Adjustment transactions generated immediately on submit
- ✅ Reports include both POS and adjustment data
- ✅ Payment method tracking preserved (QRIS/Tunai from POS)
- ✅ Reconciliation report shows discrepancies
- ✅ No data loss from existing POS transactions
- ✅ Performance: < 2s for report generation
- ✅ **Safety Net:** Catches bugs like Zulfian's double-click case automatically

---

## ⚠️ Important Notes

1. **AUTO-APPROVAL System:**
   - Admin input = trusted source (physical count)
   - Submit button → Immediately generates adjustment transaction
   - Status: draft (editing) → submitted (final, no approval needed)
   - Simplifies workflow: No multiple checkpoints!

2. **Bug Protection (Zulfian Case):**
   - Physical count = ground truth
   - Even if POS has bugs (double-click, etc), end-of-day catches it
   - Example: Distributed 50, Remaining 0 → System: Should be 50 sold
   - If POS only recorded 48 → Adjustment: +2 automatically created
   - **This is your safety net!** 🛡️

3. **POS Transactions Preserved:**
   - All existing POS transactions remain intact
   - Payment methods (QRIS/Tunai) still tracked
   - This feature supplements, not replaces POS

2. **Adjustment Transactions:**
   - Marked with special payment_method: "Stock Adjustment"
   - Linked to end_of_day_reports via stock_adjustments table
   - Can be filtered out from payment method reports

3. **Conflict Resolution:**
   - If POS > Stock Count = Warning + Admin review needed
   - System prevents negative stock
   - Validation before submission

4. **Data Integrity:**
   - Daily reports sum: POS transactions + Adjustments
   - Monthly reports aggregate all sources
   - Audit trail via stock_adjustments table

---

## 🚀 Timeline

**Target:** 1-2 days development + 1 day testing  
**Merge to main:** After approval and testing

---

## 📞 Stakeholders

- **Users:** Admin (input sisa stok)
- **Beneficiaries:** Management (accurate reports)
- **Impact:** Riders (easier end-of-day process)

---

**Last Updated:** 2025-12-11  
**Version:** 1.2.0-alpha  
**Branch:** feature/end-of-day-stock-report
