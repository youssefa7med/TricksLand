# Feature Implementation Status

## ✅ Completed

1. **Rate Issue Investigation & Fixes**
   - Added fallback to `courses.hourly_rate` when coach-specific rate not found
   - Added competition course special rate (75 EGP)
   - Added coach base rate fallback with 25% annual increase calculation
   - Added better error logging for rate queries

2. **UI Changes**
   - Changed "Online Session" to "Session" in Activity Type dropdowns
   - Added `attendance_required` field to session forms (default: true)

3. **Database Migration**
   - Created migration for attendance fields (`attendance_required`, `attendance_marked_by_admin`)
   - Created coach base rate system (`base_hourly_rate`, `rate_effective_from`, `next_rate_increase_date`)
   - Updated `get_hourly_rate()` function to include competition course check and coach base rate fallback
   - Created `get_coach_base_rate()` function for automatic 25% annual increases

## 🚧 In Progress

1. **Attendance System**
   - Added `attendance_required` field to forms
   - Need to: Add admin ability to manually mark attendance
   - Need to: Update session display to show attendance status

## ⏳ Pending

1. **Coach Base Rate Management**
   - Admin UI to set/edit coach base rates
   - Admin UI to set rate effective dates and next increase dates
   - Automatic rate increase notifications/reminders

2. **Admin Coach Profile Page**
   - View coach brief/profile information
   - Display coach base rate and rate history
   - Show coach's courses and performance metrics

3. **Course-Coach Assignment Enhancement**
   - Allow admin to use coach base rate OR override for specific course
   - UI to set course-specific rate when assigning coach

4. **Seed Data**
   - Remove all existing data
   - Create ~100 realistic records (coaches, courses, sessions, rates, attendance)

## 📝 Notes

- Competition course rate (75 EGP) is implemented in both database function and application code
- Coach base rate system calculates 25% annual increase automatically
- Rate lookup priority: hourly_rates → courses.hourly_rate → competition check → coach base rate
- Attendance is tracked separately in `coach_attendance` table, but sessions now have `attendance_required` flag
