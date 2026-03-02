# TricksLand — Admin User Guide

> **Version:** 2025  |  **Language:** English / Arabic supported

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Courses](#3-courses)
4. [Sessions](#4-sessions)
5. [Coaches](#5-coaches)
6. [Students](#6-students)
7. [Attendance — Students](#7-attendance--students)
8. [Attendance — Coaches](#8-attendance--coaches)
9. [Financial Overview](#9-financial-overview)
10. [Invoices](#10-invoices)
11. [Adjustments](#11-adjustments)
12. [Reports](#12-reports)
13. [Scheduling](#13-scheduling)
14. [Settings](#14-settings)

---

## 1. Getting Started

### Login
1. Open the app in your browser.
2. Enter your **admin email** and **password**.
3. Click **Sign In**.
4. If you forgot your password, click **Forgot password?** and follow the email link.

### Language Switch
- The top navigation bar has a language toggle (**EN / AR**).
- Switching to Arabic flips the layout to right-to-left (RTL) automatically.

### Navigation
All admin pages are accessible from the **sidebar** on the left (desktop) or the **hamburger menu** (mobile).

---

## 2. Dashboard

The dashboard gives a real-time snapshot of the academy:

| Card | What it shows |
|---|---|
| **Total Revenue** | Sum of all paid student fees for the current period |
| **Total Coaches** | Number of active coaches |
| **Upcoming Sessions** | Sessions scheduled for today and the next few days |
| **Pending Invoices** | Invoices not yet marked as paid |
| **Recent Activity** | Latest attendance marks, new enrolments, etc. |

---

## 3. Courses

### View Courses
Go to **Admin → Courses**. Each course card shows: name, assigned coaches, number of enrolled students, and active status.

### Create a Course
1. Click **+ New Course**.
2. Fill in: **Course Name**, **Description**, **Fees per hour** (used when generating student invoices).
3. Click **Save**.

### Edit / Delete a Course
- Click the **⋮** menu on a course card to **Edit** or **Delete**.
- Deleting a course is only possible if it has no active sessions.

### Manage Coaches for a Course
- Open a course → go to the **Coaches** tab.
- Use **Add Coach** to assign a coach, or **Remove** to unassign.

### Manage Students for a Course
- Open a course → go to the **Students** tab.
- Use **Add Student** to enrol a student, choosing their **monthly fee** override if needed.

---

## 4. Sessions

### View Sessions
Go to **Admin → Sessions**. Sessions are listed chronologically with their course, date, time, and status.

### Create a Session
1. Click **+ New Session**.
2. Select the **Course**, set the **Date**, **Start Time**, and **End Time**.
3. Click **Save**.

### Edit / Delete a Session
- Use **Edit** or **Delete** from the session list row actions.
- Sessions with recorded attendance cannot be deleted.

### Session Status
| Status | Meaning |
|---|---|
| **Upcoming** | Scheduled in the future |
| **Today** | Scheduled for today |
| **Past** | Already occurred |

---

## 5. Coaches

### View Coaches
Go to **Admin → Coaches**. The list shows each coach's name, email, assigned courses, and their hourly rate.

### Add a Coach
1. First create a user account for the coach via **Admin → Users** (or invite by email through Settings).
2. Once the account exists, the coach will appear in the coaches list automatically.

### Edit Coach Profile
- Click a coach row → **Edit** to update their **display name**, **hourly rate** for payroll, and **notes**.

### Coach Detail Page
- View all **courses** assigned to a coach.
- See a summary of **billed hours** and **net payable** for the current month.

---

## 6. Students

### View Students
Go to **Admin → Students**. The list shows name, email, enrolled courses, and balance status.

### Add a Student
1. Click **+ New Student**.
2. Enter **Full Name**, **Email**, **Phone** (optional).
3. Click **Save**.

### Edit / Delete a Student
- Click a student row → **Edit** to update details.
- Click **Delete** to remove (only available for students with no financial history).

### Student Detail / Edit Page
- View and edit the student's personal information.
- See their enrolled courses and monthly fee per course.

---

## 7. Attendance — Students

Go to **Admin → Student Attendance**.

### Mark Attendance
1. Select a **session** from the dropdown.
2. A list of enrolled students appears.
3. Click the toggle next to each student to mark **Present** or **Absent**.
4. Changes are saved automatically.

### View History
- Use the **month filter** to browse past attendance records.
- Each marked session shows date, course, and count of present/absent.

---

## 8. Attendance — Coaches

Go to **Admin → Attendance** (the admin‑side attendance page shows coach attendance records for oversight).

### What you see
- Each row = one coach attendance record with: **Coach Name**, **Session**, **Date**, **Arrival Time**, **Leaving Time**, **Duration**, **Billed Hours**.
- **Billed Hours** are calculated using the **15-minute module rule** (see below).

### 15-Minute Module Billing Rule
> Coaches are billed in **completed 15-minute units**.
> - If a coach works **44 minutes**, they earn **0.50 hrs** (2 × 15-min = 30 min billed, 14 min remainder dropped).
> - If a coach works **45 minutes**, they earn **0.75 hrs** (3 × 15-min modules).
> - This is calculated automatically from GPS check-in / check-out times.

### Export
- Use the **Export** button to download attendance records as CSV.

---

## 9. Financial Overview

Go to **Admin → Financial**.

This page aggregates revenue vs. payable:

| Section | Description |
|---|---|
| **Student Revenue** | Total fees collected for the selected period |
| **Coach Payable** | Total net payable to coaches (based on billed hours × hourly rate) |
| **Net Profit** | Revenue minus payable |

Use the **month/period filter** in the top right to change the reporting window.

---

## 10. Invoices

Go to **Admin → Invoices**.

### View Invoices
All generated invoices are listed with: **Student Name**, **Month**, **Amount**, **Status** (Pending / Paid / Sent).

### Generate an Invoice
1. Click **+ Generate Invoice** (or it may be generated automatically at month-end based on student attendance).
2. Select the **student** and **month**.
3. Review the breakdown (hours attended × per-hour fee).
4. Click **Save**.

### Send an Invoice
- Click **Send** on any invoice to email it to the student.
- The system sends a formatted invoice PDF to the student's registered email.

### Preview an Invoice
- Click **Preview** to open the printable invoice view before sending.

### Mark as Paid
- Click **Mark as Paid** to update the invoice status.

---

## 11. Adjustments

Go to **Admin → Adjustments** (or **Coach → Adjustments** for coaches).

Adjustments allow manual corrections to a coach's or student's balance:

| Field | Description |
|---|---|
| **Type** | Deduction or Addition |
| **Amount** | The adjusted amount |
| **Reason** | Description of why the adjustment was made |
| **Linked to** | Coach or Student, and the relevant month |

---

## 12. Reports

Go to **Admin → Reports**.

### Coach Payroll Report
- Select a **month** and click **Generate**.
- Output includes per-coach:
  - Total sessions attended
  - Total **billed hours** (15-min module rule)
  - Gross billed amount (billed hrs × hourly rate)
  - Adjustments
  - **Net payable**

### Coach Hours Report
- Lists each session a coach attended with: date, course, arrival, departure, duration, and **billed hours** per session.

### Student Attendance Report
- Per-student breakdown: total sessions, attended, missed, attendance percentage, total fees.

### Export
All reports have an **Export to CSV** button for use in spreadsheets or accounting tools.

---

## 13. Scheduling

Go to **Admin → Scheduling**.

The scheduling view provides a **calendar / timetable** overview of all sessions across courses.

- Use the **week/month** toggle to change the view.
- Click a session block to view details or navigate to the session edit page.
- Useful for spotting scheduling conflicts or planning new sessions.

---

## 14. Settings

Go to **Settings** (accessible from the sidebar or top navigation).

### Academy Location
- Set the **GPS coordinates** (latitude / longitude) and **radius** (metres) of the academy.
- This is used by the coach GPS check-in system — coaches must be within the defined radius to check in.

### User Management
- **Admin → Users** — view all registered users, change roles (admin / coach), or deactivate accounts.

### Language
- Change your preferred display language (English / Arabic).
- This setting is per-user and stored in your account preferences.

---

## Tips & Best Practices

- **End-of-month workflow:** Generate invoices → review coach payroll report → approve payments → mark invoices paid.
- **Coach GPS setup:** Make sure the academy location coordinates in Settings are accurate — if coaches can't check in, the radius may need to be increased.
- **15-min module rule:** Remind coaches to check out when they leave. If a coach forgets to check out, an admin can still review the record and the system will show no leaving time until a check-out is recorded.
- **Export regularly:** Download CSV reports monthly for your accounting records.

---

*For technical issues, contact your system administrator.*
