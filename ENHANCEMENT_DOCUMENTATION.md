# TricksLand Academy - System Enhancement Documentation

## 🎯 Overview

Comprehensive enhancement of the TricksLand coaching management system with advanced features for  attendance tracking, financial management, course scheduling, and reporting.

**Date**: February 22, 2026  
**Version**: 2.0  
**Status**: Implementation Complete

---

## 📋 Implementation Summary

### ✅ Completed Enhancements

#### 1. **Enhanced Student Attendance System**
- **Table**: `student_attendance`
- **Features**:
  - Track attendance per student per session
  - Mark as Present, Absent, or Late
  - Record arrival and leaving times
  - Auto-calculate session duration
  - Geolocation-based check-in validation
  - Monthly attendance summaries via SQL view

**Server Actions** (`lib/actions/attendance.ts`):
- `markStudentAttendance()` - Mark single student attendance
- `bulkMarkAttendance()` - Mark multiple students at once
- `getSessionAttendance()` - Get all attendance for a session
- `getCourseMonthlyAttendance()` - Get monthly summary for course
- `getStudentAttendanceHistory()` - Get student's history
- `getAttendanceStats()` - Calculate course statistics
- `calculateSessionBillableHours()` - Calculate payable hours from attendance

#### 2. **Quarter-Hour Billing System**
- **Billing Rules**:
  - < 15 minutes: 0 hours (not billable)
  - 15-29 minutes: 0.25 hours
  - 30-44 minutes: 0.5 hours
  - 45-59 minutes: 0.75 hours
  - Continues in 15-minute increments

- **Utility Functions** (`lib/utils/billing.ts`):
  - `calculateBillableHours()` - Main calculation function
  - `calculateBillableHoursFromTimes()` - From start/end times
  - `calculateSessionBilling()` - Full billing calculation
  - `getQuarterHourBreakdown()` - For user display
  - `formatHours()` - Format for UI

- **Database Function**: `calculate_billable_hours(arrival_time, leaving_time)`

#### 3. **Geolocation System**
- **Configurable Radius**: 60 meters (default, adjustable via admin settings)
- **Check-in Validation**: Uses Haversine formula for accurate distance
- **Database**: Stored in `admin_settings` table
- **API**: `getGeolocationRadius()` utility function

#### 4. **Course Scheduling System**
- **Table**: `course_schedules`
- **Features**:
  - Define total sessions and sessions per week
  - Auto-calculate expected end date
  - Track sessions by status (Scheduled, Completed, Postponed, Cancelled, Extra)
  - Session rescheduling with history

- **Session Statuses** (new enum `session_status`):
  - `scheduled` - Upcoming session
  - `completed` - Session finished
  - `postponed` - Rescheduled session
  - `cancelled` - Cancelled session
  - `extra` - Additional session

- **Server Actions** (`lib/actions/scheduling.ts`):
  - `createCourseSchedule()` - Create new schedule
  - `updateSessionStatus()` - Change session status
  - `postoneSession()` - Postpone with rescheduling
  - `cancelSession()`, `completeSession()`, `markSessionAsExtra()`
  - `getScheduleStats()` - Calculate schedule progress
  - `validateScheduleDates()` - Validate date ranges

#### 5. **Financial Management System**

**a) Student Payments** (`student_payments` table)
- Track course fees per student
- Payment status: Not Paid, Partially Paid, Paid
- Due dates and payment tracking
- Auto-calculated remaining balance

**b) Payment Transactions** (`payment_transactions` table)
- Audit trail of all payments
- Payment methods (Cash, Bank Transfer, Card, Check, Other)
- Reference numbers and notes
- Automatic status updates via trigger

**c) Course Expenses** (`course_expenses` table)
- Track all course expenses
- Categories: Instructor, Materials, Venue, Equipment, Marketing, Other
- Supports filtering by date range

**d) Financial Views**
- `course_financial_summary` - Complete course profitability
- Income = All student payments
- Expenses = All course expenses
- Profit = Income - Expenses

- **Server Actions** (`lib/actions/financial.ts`):
  - `upsertStudentPayment()` - Create/update payment record
  - `recordPaymentTransaction()` - Record payment with auto-status update
  - `addCourseExpense()` - Track expenses
  - `getCourseFinancialSummary()` - Financial stats per course
  - `getPlatformRevenueSummary()` - Platform-wide summary

#### 6. **Admin Settings System**
- **Table**: `admin_settings`
- **Configurable Settings**:
  - `geolocation_radius_meters` (default: 60)
  - `quarter_hour_increment` (default: 15)
  - `default_course_fee` (default: 0)
  - `platform_name` (default: TricksLand Academy)

- **Features**:
  - Type-safe value parsing (string, integer, float, boolean, json)
  - In-memory caching with 5-minute TTL
  - Public/private settings (only public visible to coaches)

- **Utility Functions** (`lib/utils/settings.ts`):
  - `getSetting()` - Get single setting with caching
  - `getSettings()` - Batch get multiple settings
  - `updateSetting()` - Admin update (upsert)
  - `getGeolocationRadius()`, `getQuarterHourIncrement()`, etc.
  - `initializeDefaultSettings()` - Setup on first run
  - `clearSettingsCache()` - Clear cache on admin updates

#### 7. **Report Generation System**

**Available Reports** (`lib/actions/reports.ts`):
1. **Attendance Reports**
   - Student monthly attendance per course
   - Course attendance summary
   - Platform attendance rate

2. **Financial Reports**
   - Course financial summary (income, expenses, profit)
   - Course payment details with status
   - Course expense breakdown by category
   - Platform revenue summary

3. **Coach Reports**
   - Coach worked hours per month
   - Coach payroll summary
   - Coach monthly earnings breakdown

4. **Summary Reports**
   - Platform revenue and expenses
   - Attendance trends
   - Payment collection summary

**Functions**:
- `generateStudentAttendanceReport(month)` - Attendance per student
- `generateCourseAttendanceReport(courseId, month)` - Per course
- `generateCoursePaymentReport(courseId)` - Student payment status
- `generateCourseExpenseReport(courseId)` - Expense details
- `generateCoachPayrollReport(month)` - Coach earnings
- `generateRevenueSummaryReport(month)` - Platform summary
- `generateAttendanceSummaryReport(month)` - Attendance summary

#### 8. **Excel Export System**

**Export Functions** (`lib/actions/export.ts`):
- `exportStudentAttendance(month)` - Attendance with totals
- `exportCoursePayments(courseId, courseName)` - Payment status report
- `exportCourseExpenses(courseId, courseName)` - Expense breakdown
- `exportCoachPayroll(month)` - Coach payroll
- `exportRevenueSummary(month)` - Financial summary

**Features**:
- Professional Excel formatting with headers, colors, borders
- Auto-fit columns
- Currency formatting (EGP)
- Totals rows with summaries
- Metadata (timestamp, creator)
- Returns Buffer for download

---

## 📊 Database Schema Changes

### New Tables

```sql
-- Student Attendance Tracking
student_attendance
├── session_id (FK)
├── student_id (FK)
├── course_id (FK)
├── attendance_date
├── status (present | absent | late)
├── arrival_time, leaving_time
├── duration_minutes
├── marked_by (FK)
└── notes

-- Course Scheduling
course_schedules
├── course_id (FK) UNIQUE
├── total_sessions
├── sessions_per_week
├── start_date, scheduled_end_date, actual_end_date
├── sessions_completed, cancelled, postponed, extra
├── status (active | completed | archived)
└── created_by (FK)

-- Financial Tracking
student_payments
├── student_id (FK)
├── course_id (FK)
├── course_fee
├── amount_paid
├── remaining_balance (generated)
├── payment_status (not_paid | partially_paid | paid)
└── due_date

payment_transactions
├── payment_record_id (FK)
├── amount, transaction_date, transaction_time
├── payment_method (cash | bank_transfer | card | check | other)
└── reference_number, notes

course_expenses
├── course_id (FK)
├── title, description
├── amount, expense_date
├── category (instructor | materials | venue | equipment | marketing | other)
└── created_by (FK)

-- Admin Configuration
admin_settings
├── key UNIQUE
├── value (string)
├── value_type (string | integer | float | boolean | json)
├── description
├── is_public
└── timestamps
```

### Modified Tables

```sql
-- sessions table additions
ALTER TABLE sessions
ADD COLUMN session_status session_status DEFAULT 'completed'
ADD COLUMN rescheduled_from UUID REFERENCES sessions(id)
```

### New Enums

```sql
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'postponed', 'cancelled', 'extra');
CREATE TYPE payment_status AS ENUM ('not_paid', 'partially_paid', 'paid');
CREATE TYPE expense_category AS ENUM ('instructor', 'materials', 'venue', 'equipment', 'marketing', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'check', 'other');
```

### New Functions

```sql
-- Calculate billable hours in quarter-hour increments
calculate_billable_hours(arrival_time TIME, leaving_time TIME) → NUMERIC

-- Get admin setting by key
get_admin_setting(key VARCHAR, default_value TEXT) → TEXT
```

### New Views

```sql
-- Student attendance summary per month
student_monthly_attendance

-- Course financial summary (income, expenses, profit)
course_financial_summary
```

### New Indexes

```sql
idx_student_attendance_session
idx_student_attendance_student
idx_student_attendance_course
idx_student_attendance_date
idx_course_schedules_course
idx_course_schedules_status
idx_course_expenses_course
idx_course_expenses_date
idx_course_expenses_category
idx_student_payments_student
idx_student_payments_course
idx_student_payments_status
idx_payment_transactions_payment_record
idx_payment_transactions_date
```

### Triggers

```sql
-- Auto-update payment status when transaction is recorded
trigger_update_payment_status_on_transaction

-- Auto-calculate duration in attendance records
trigger_calculate_attendance_duration
```

---

## 🔐 Row-Level Security (RLS) Policies

### `student_attendance`
- ✅ Admins: Full access (INSERT, UPDATE, SELECT, DELETE)
- ✅ Coaches: Can mark attendance for their students
- ✅ Students: Can view own attendance

### `course_schedules`
- ✅ Admins: Full access
- ✅ Coaches: Can view schedules for assigned courses (READ-ONLY)

### `course_expenses`
- ✅ Admins: Full access
- ❌ Coaches: No access (financial data)

### `student_payments`
- ✅ Admins: Full access
- ❌ Coaches: No access (financial data)
- ✅ Students: Can view own payment balance only

### `payment_transactions`
- ✅ Admins: Full access
- ❌ Coaches: No access

### `admin_settings`
- ✅ Admins: Full access (modify)
- ✅ Public settings: Anyone can read
- ❌ Private settings: Admins only

---

## 🛠 TypeScript Types

All new types are defined in `types/database.ts`:

```typescript
// Enums
type SessionStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled' | 'extra';
type AttendanceStatus = 'present' | 'absent' | 'late';
type PaymentStatus = 'not_paid' | 'partially_paid' | 'paid';
type ExpenseCategory = 'instructor' | 'materials' | 'venue' | 'equipment' | 'marketing' | 'other';

// Interfaces
interface StudentAttendance { ... }
interface CourseSchedule { ... }
interface StudentPayment { ... }
interface PaymentTransaction { ... }
interface CourseExpense { ... }
interface AdminSetting { ... }
interface StudentMonthlyAttendance { ... }
interface CourseFinancialSummary { ... }
```

---

## 📂 File Structure

### New Server Actions
```
lib/actions/
├── attendance.ts      (Attendance management)
├── financial.ts       (Payments, expenses, financial tracking)
├── scheduling.ts      (Course schedules and session status)
├── reports.ts         (Report generation)
└── export.ts          (Excel export)
```

### New Utilities
```
lib/utils/
├── billing.ts         (Quarter-hour calculations)
└── settings.ts        (Admin settings management)
```

---

## 🚀 Migration Instructions

### 1. Apply Database Migration
```bash
# In Supabase SQL Editor, run:
# supabase/migrations/20260222_add_attendance_financial_scheduling.sql
```

This migration creates:
- All new tables with proper foreign keys
- All new enums
- All helper functions
- All triggers
- All RLS policies
- All views and indexes

### 2. Initialize Default Settings
```typescript
import { initializeDefaultSettings } from '@/lib/utils/settings';

// Run once on system startup
await initializeDefaultSettings();
```

### 3. Update Environment (if needed)
```env
# No new env vars required - settings stored in database
```

---

## 💡 Usage Examples

### Mark Student Attendance
```typescript
import { markStudentAttendance } from '@/lib/actions/attendance';

const result = await markStudentAttendance(
  sessionId: '123',
  studentId: '456',
  courseId: '789',
  status: 'present',
  arrivalTime: '09:00',
  leavingTime: '10:30',
  notes: 'On time'
);
```

### Calculate Billable Hours
```typescript
import { calculateBillableHours } from '@/lib/utils/billing';

const hours = calculateBillableHours(45); // 45 minutes → 0.75 hours
const hours2 = calculateBillableHours(10); // 10 minutes → 0 hours (not billable)
```

### Record Student Payment
```typescript
import { recordPaymentTransaction } from '@/lib/actions/financial';

const result = await recordPaymentTransaction(
  paymentRecordId: '123',
  amount: 1500,
  paymentMethod: 'cash',
  referenceNumber: 'Receipt#001'
);
// Status automatically updates to 'paid' or 'partially_paid'
```

### Create Course Schedule
```typescript
import { createCourseSchedule } from '@/lib/actions/scheduling';

const result = await createCourseSchedule(
  courseId: '123',
  totalSessions: 12,
  sessionsPerWeek: 2,
  startDate: '2026-03-01',
  scheduledEndDate: '2026-05-15'
);
```

### Export Course Payments
```typescript
import { exportCoursePayments } from '@/lib/actions/export';

const buffer = await exportCoursePayments('courseId', 'Course Name');
// Send as download: res.send(buffer);
```

### Get Course Financial Summary
```typescript
import { getCourseFinancialSummary } from '@/lib/actions/financial';

const summary = await getCourseFinancialSummary('courseId');
// Returns: { total_income, total_expenses, net_profit, ... }
```

---

## 🎨 UI Components Needed

The following UI components should be created to utilize these features:

### Admin Components
1. **Attendance Management**
   - Student attendance marks (Present/Absent/Late)
   - Bulk attendance marking
   - Attendance history view

2. **Financial Dashboard**
   - Course financial summary cards
   - Income vs Expenses chart
   - Student payment status table
   - Payment collection progress

3. **Expense Tracking**
   - Add expense form
   - Expense list by category
   - Monthly expense breakdown

4. **Course Scheduling**
   - Schedule creation wizard
   - Session status management
   - Schedule progress visualization

5. **Reports & Exports**
   - Report selection dropdowns
   - Export to Excel buttons
   - Report filtering (by course, month, etc.)
   - Report preview tables

6. **Admin Settings**
   - Geolocation radius slider
   - Default course fee input
   - Quarter-hour increment display
   - Platform name customization

### Coach Components
1. **Attendance Marking** (for their courses)
   - Quick attendance mark UI
   - Bulk mark form
   - View student list withs status

2. **Workload Dashboard**
   - Weekly/monthly hours worked
   - Course assignments
   - Session status view (not financial data)

### Student Components
1. **Payment Portal**
   - View course fee
   - View amount paid
   - View remaining balance
   - Download payment history

2. **Attendance View**
   - Monthly attendance summary
   - Attendance history per course
   - Attendance percentage

---

## ✨ Key Features Summary

| Feature | Admin | Coach | Student |
|---------|-------|-------|---------|
| Mark Attendance | ✅ | ✅ | ❌ |
| View Attendance | ✅ | ✅ (own) | ✅ (own) |
| Manage Schedules | ✅ | ❌ | ❌ |
| View Schedule | ✅ | ✅ (assigned) | ❌ |
| Track Expenses | ✅ | ❌ | ❌ |
| Record Payments | ✅ | ❌ | ❌ |
| View Financial Data | ✅ | ❌ | ✅ (balance only) |
| Generate Reports | ✅ | ❌ | ❌ |
| Export to Excel | ✅ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ |

---

## 🔍 Testing Checklist

- [ ] Database migration applies without errors
- [ ] All tables created with correct columns and types
- [ ] All RLS policies active and working
- [ ] Create student attendance record
- [ ] Mark attendance with geolocation validation
- [ ] Verify quarter-hour calculation accuracy
- [ ] Create course schedule
- [ ] Update session status
- [ ] Record student payment (auto-status update)
- [ ] Add course expense
- [ ] Generate attendance report
- [ ] Export to Excel without errors
- [ ] Get admin setting (with caching)
- [ ] Update admin setting
- [ ] Verify cache clearing on update
- [ ] Test bulk attendance marking
- [ ] Test RLS policies (coaches can't access financial data)

---

## 📝 Notes

- All timestamps are in UTC/TIMESTAMPTZ
- Financial calculations use NUMERIC(10, 2) for precision
- Excel exports include metadata and timestamps
- Settings cache auto-expires after 5 minutes
- All server actions include proper error handling
- Triggers ensure data consistency automatically

---

## 🔮 Future Enhancements

1. **Advanced Reporting**
   - Custom report builder
   - Scheduled email reports
   - Report templates

2. **Mobile App**
   - Attendance marking on mobile
   - Push notifications

3. **Integration**
   - Email invoice delivery
   - Payment gateway integration
   - SMS notifications

4. **Analytics**
   - Attendance trends
   - Performance metrics
   - Revenue forecasting

---

**Last Updated**: February 22, 2026  
**System**: TricksLand Academy Management System v2.0  
**Maintained By**: Engineering Team

