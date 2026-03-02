# TricksLand — Coach User Guide

> **Version:** 2025  |  **Language:** English / Arabic supported

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [My Courses](#3-my-courses)
4. [Sessions](#4-sessions)
5. [Student Attendance](#5-student-attendance)
6. [Coach Attendance — Check‑In & Check‑Out](#6-coach-attendance--checkin--checkout)
7. [Invoices](#7-invoices)
8. [Adjustments](#8-adjustments)
9. [Settings](#9-settings)
10. [FAQ](#10-faq)

---

## 1. Getting Started

### Login
1. Open the app in your browser.
2. Enter your **email** and **password** provided by the academy admin.
3. Click **Sign In**.
4. To reset your password, click **Forgot password?** and follow the link sent to your email.

### Language Switch
- Use the **EN / AR** toggle in the top navigation bar to switch between English and Arabic.
- Switching to Arabic sets the layout to right-to-left (RTL) automatically.

### Navigation
All coach pages are accessible from the **sidebar** (desktop) or the **menu** (mobile).

---

## 2. Dashboard

The coach dashboard shows a personal overview:

| Card | What it shows |
|---|---|
| **Upcoming Sessions** | Your next scheduled sessions |
| **This Month** | Quick summary of sessions attended, billed hours, and estimated earnings |
| **Recent Attendance** | Last few check-in records |
| **Pending Invoices** | Invoices not yet processed |

---

## 3. My Courses

Go to **Coach → Courses**.

- View all courses assigned to you by the admin.
- Each course card shows the **course name**, **enrolled students**, and **session schedule**.
- Click a course to see the list of enrolled students and upcoming sessions for that course.

> **Note:** Course assignments are managed by the admin. Contact your admin if a course is missing.

---

## 4. Sessions

Go to **Coach → Sessions**.

### View Sessions
All your sessions are listed with: **Course Name**, **Date**, **Start Time**, **End Time**, and **Status**.

### Create a Session
1. Click **+ New Session**.
2. Select the **Course**, set the **Date**, **Start Time**, and **End Time**.
3. Click **Save**.

> Some academies restrict session creation to admins only — check with your admin if the button is missing.

### Edit / Delete a Session
- Use the **Edit** or **Delete** actions from the session row.
- Sessions with recorded attendance cannot be deleted.

---

## 5. Student Attendance

Go to **Coach → Student Attendance**.

### Mark Attendance
1. Select the **session** you want to mark from the session dropdown.
2. A list of enrolled students appears.
3. Toggle each student as **Present** or **Absent**.
4. Attendance is saved automatically — no submit button needed.

### View History
- Use the **month filter** to browse past attendance.
- Summary statistics at the top show: total sessions, attended, missed.

---

## 6. Coach Attendance — Check‑In & Check‑Out

Go to **Coach → Attendance**.

This is the most important page for tracking your working hours and ensuring accurate **billed hours** for payroll.

---

### 6.1 Overview — How Billed Hours Work

Your pay is based on **billed hours**, not raw minutes. Billed hours are calculated using the **15-minute module rule**:

> **Billed hours = number of completed 15-minute modules × 0.25 hrs**

| Actual minutes worked | Billed hours |
|---|---|
| 14 min | 0.00 hrs (0 complete modules) |
| 15 min | 0.25 hrs |
| 29 min | 0.25 hrs (1 module) |
| 30 min | 0.50 hrs |
| 44 min | 0.50 hrs (2 modules, 14 min remainder dropped) |
| 45 min | 0.75 hrs |
| 60 min | 1.00 hr |
| 74 min | 1.00 hr (4 modules, 14 min remainder dropped) |
| 75 min | 1.25 hrs |
| 90 min | 1.50 hrs |

> ⚠️ **Important:** Any remainder under 15 minutes is **not billed**. Always check out promptly to avoid losing a module.

---

### 6.2 Requirements

- **HTTPS connection** — the GPS feature requires a secure connection. If you see an HTTPS error, make sure you're accessing the app via `https://`.
- **Browser location permission** — your browser will ask for location access. Click **Allow**.
- **Be within the academy radius** — you must be physically inside the academy (within the GPS radius configured by your admin) to check in.

---

### 6.3 Step-by-Step: Check In

1. Go to **Coach → Attendance**.
2. Click the **Mark Attendance** tab.
3. Select the **session** you are about to teach from the session list.
4. Click **Check In** (📍).
5. Your browser will request your location — click **Allow**.
6. If your location is within the academy, you will see a **✓ Checked in at HH:MM** confirmation.
7. If your location is outside the academy radius, you will see a distance error. Move closer to the academy and try again.

---

### 6.4 Step-by-Step: Check Out

> ⚡ Always check out when you finish your session — this is what triggers the billed hours calculation.

1. After your session ends, return to **Coach → Attendance → Mark Attendance**.
2. Your active session will show a **Check Out (record billed hours)** 🏁 button.
3. Click **Check Out**.
4. The system records your leaving time and calculates:
   - **Duration** (minutes from arrival to departure)
   - **Billed hours** (duration ÷ 15-min modules, rounded down)
5. A summary panel appears showing:
   - **Arrived:** your check-in time
   - **Left:** your check-out time
   - **Duration:** total minutes
   - **Billed hours:** the amount credited to your payroll
   - If there is a remainder (e.g. 14 min), this is shown as a note: *"X min remainder not billed (15-min module rule)"*

---

### 6.5 Attendance History

- Click the **Attendance History** tab.
- Use the **month filter** to see records for any past month.
- Each row shows: session date, course, arrival time, departure time, duration, and billed hours.
- Summary statistics at the top show total sessions, attended, and missed.

---

### 6.6 Tips

- ✅ **Check in as soon as you arrive**, not when the session starts — every minute counts towards your billed modules.
- ✅ **Check out as soon as you finish** — a 14-min remainder is not billed, but a 15-min remainder is.
- ✅ If you accidentally close the browser after check-in, just reopen the app and the active session will still show the **Check Out** button.
- ❌ Do **not** share your login — check-in records are tied to your account and used for payroll.

---

## 7. Invoices

Go to **Coach → Invoices**.

### View Invoices
Your invoices are generated by the admin, usually monthly. Each invoice shows:
- **Month**
- **Total billed hours**
- **Gross amount** (hours × hourly rate)
- **Adjustments** (bonuses or deductions)
- **Net payable**

### Invoice Status
| Status | Meaning |
|---|---|
| **Pending** | Awaiting admin review |
| **Approved** | Admin has approved, payment pending |
| **Paid** | Payment has been processed |

> You cannot edit invoices — contact your admin for any corrections.

---

## 8. Adjustments

Go to **Coach → Adjustments**.

The admin may apply **adjustments** to your account — these are additions or deductions outside your regular billed hours:

| Adjustment Type | Example |
|---|---|
| **Addition** | Bonus for a special workshop, travel reimbursement |
| **Deduction** | Advance deduction, administrative fee |

Each adjustment shows the **type**, **amount**, **reason**, and the **month** it applies to.

> Adjustments are managed by the admin. If you see an incorrect adjustment, contact your admin.

---

## 9. Settings

Go to **Settings** (accessible from the top-right menu or sidebar).

### Personal Information
- Update your **display name** and **email** (email changes may require confirmation).

### Password
- Click **Change Password** to set a new password.
- You will need to enter your current password first.

### Language
- Switch between **English** and **Arabic** — your preference is saved to your account.

---

## 10. FAQ

**Q: I can't check in — it says I'm outside the academy radius.**
> Make sure you are physically inside or very close to the academy building. If the problem persists, the academy GPS coordinates may need to be adjusted — contact your admin.

**Q: I forgot to check out yesterday. What happens?**
> The system will show your check-in without a leaving time. No billed hours are calculated until you check out. Contact your admin to manually enter the leaving time for that record.

**Q: My billed hours seem lower than expected.**
> Billed hours use the 15-minute module rule — any remainder under 15 minutes is not counted. For example, 89 minutes = 1.25 hrs (5 modules), not 1.48 hrs. Check your check-in and check-out times in Attendance History.

**Q: I see a "This feature requires HTTPS" error.**
> Your browser is connecting via HTTP, not HTTPS. Make sure the URL starts with `https://`. If you're on a local network, ask your admin to configure SSL.

**Q: Can I view my total earnings for the month?**
> Yes — go to **Coach → Invoices** for the monthly summary, or check the **Dashboard** for a quick overview.

**Q: The Check-In button is missing.**
> Only sessions assigned to you will appear. Make sure you have selected the correct session. If the session is missing entirely, contact your admin to verify the session is assigned to you.

---

*For technical issues, contact your academy administrator.*
