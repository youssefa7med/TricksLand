/**
 * Server Actions for Excel Export
 * Generates Excel files from reports using ExcelJS
 */

'use server';

import * as ExcelJS from 'exceljs';
import {
  generateStudentAttendanceReport,
  generateCoursePaymentReport,
  generateCourseExpenseReport,
  generateCoachPayrollReport,
  generateRevenueSummaryReport,
  generateAttendanceSummaryReport,
} from './reports';

// ============================================================================
// EXCEL STYLING HELPERS
// ============================================================================

const headerFill = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FF4472C4' }, // Blue
};

const headerFont = {
  bold: true,
  color: { argb: 'FFFFFFFF' }, // White
  size: 11,
};

const totalFill = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFF0F0F0' }, // Light gray
};

const totalFont = {
  bold: true,
  size: 11,
};

const currencyFormat = '_("EGP"* #,##0.00_);_("EGP"* (#,##0.00);_("EGP"* "-"??_);_(@_)';
const percentFormat = '0.00"%"';

/**
 * Apply header styling to a row
 */
function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Apply currency formatting to a cell
 */
function formatCurrency(cell: ExcelJS.Cell): void {
  cell.numFmt = currencyFormat;
}

/**
 * Generate Student Attendance Export
 */
export async function exportStudentAttendance(month: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Headers
  const headerRow = worksheet.addRow([
    'Student Name',
    'Course',
    'Total Sessions',
    'Attended',
    'Absent',
    'Late',
    'Attendance %',
  ]);
  styleHeaderRow(headerRow);

  // Fetch data
  const data = await generateStudentAttendanceReport(month);

  // Add data rows
  for (const record of data) {
    const row = worksheet.addRow([
      record.student_name,
      record.course_name,
      record.total_sessions,
      record.sessions_attended,
      record.sessions_absent,
      record.sessions_late,
      record.attendance_percentage,
    ]);

    // Format percentage
    row.getCell(7).numFmt = percentFormat;
  }

  // Add summary row
  const totals = data.reduce(
    (acc, r) => ({
      total_sessions: acc.total_sessions + r.total_sessions,
      sessions_attended: acc.sessions_attended + r.sessions_attended,
      sessions_absent: acc.sessions_absent + r.sessions_absent,
      sessions_late: acc.sessions_late + r.sessions_late,
    }),
    { total_sessions: 0, sessions_attended: 0, sessions_absent: 0, sessions_late: 0 }
  );

  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    totals.total_sessions,
    totals.sessions_attended,
    totals.sessions_absent,
    totals.sessions_late,
    totals.total_sessions > 0
      ? Math.round((totals.sessions_attended / totals.total_sessions) * 100)
      : 0,
  ]);
  styleHeaderRow(totalRow);

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    if (column) {
      (column as any).eachCell({ includeEmpty: true }, (cell: any) => {
        const cellValue = cell.value?.toString() || '';
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      column.width = maxLength < 12 ? 12 : maxLength + 2;
    }
  });

  // Add metadata
  (worksheet.properties as any).created = new Date();
  workbook.creator = 'TricksLand Academy';

  return (await workbook.xlsx.writeBuffer()) as any;
}

/**
 * Generate Course Payment Export
 */
export async function exportCoursePayments(courseId: string, courseName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payments');

  // Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Payment Summary - ${courseName}`;
  titleCell.font = { bold: true, size: 14 };

  // Headers
  const headerRow = worksheet.addRow([
    'Student Name',
    'Course Fee',
    'Amount Paid',
    'Remaining',
    'Status',
    'Due Date',
    'Payment Date',
  ]);
  styleHeaderRow(headerRow);

  // Fetch data
  const data = await generateCoursePaymentReport(courseId);

  // Add data rows
  let totalFee = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  for (const record of data) {
    const row = worksheet.addRow([
      record.student_name,
      record.course_fee,
      record.amount_paid,
      record.remaining_balance,
      record.payment_status === 'paid' ? 'PAID' : record.payment_status === 'partially_paid' ? 'PARTIAL' : 'NOT PAID',
      record.due_date ? new Date(record.due_date).toLocaleDateString('en-EG') : '-',
      '-', // would need payment date from transactions
    ]);

    // Format currency
    formatCurrency(row.getCell(2));
    formatCurrency(row.getCell(3));
    formatCurrency(row.getCell(4));

    totalFee += record.course_fee;
    totalPaid += record.amount_paid;
    totalRemaining += record.remaining_balance;
  }

  // Add totals row
  const totalRow = worksheet.addRow(['TOTAL', totalFee, totalPaid, totalRemaining, '', '', '']);
  styleHeaderRow(totalRow);
  formatCurrency(totalRow.getCell(2));
  formatCurrency(totalRow.getCell(3));
  formatCurrency(totalRow.getCell(4));

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  (worksheet.properties as any).created = new Date();
  workbook.creator = 'TricksLand Academy';

  return (await workbook.xlsx.writeBuffer()) as any;
}

/**
 * Generate Course Expenses Export
 */
export async function exportCourseExpenses(
  courseId: string,
  courseName: string,
  startDate?: string,
  endDate?: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Expenses');

  // Title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Expenses - ${courseName}`;
  titleCell.font = { bold: true, size: 14 };

  // Headers
  const headerRow = worksheet.addRow(['Date', 'Category', 'Title', 'Amount', 'Description']);
  styleHeaderRow(headerRow);

  // Fetch data
  const data = await generateCourseExpenseReport(courseId, startDate, endDate);

  // Add data rows
  let totalAmount = 0;

  for (const record of data) {
    const row = worksheet.addRow([
      new Date(record.date).toLocaleDateString('en-EG'),
      record.category.toUpperCase(),
      record.title,
      record.amount,
      record.description || '',
    ]);

    formatCurrency(row.getCell(4));
    totalAmount += record.amount;
  }

  // Add totals row
  worksheet.addRow(['', '', 'TOTAL', totalAmount, '']);
  const lastRow = worksheet.lastRow;
  if (lastRow) {
    lastRow.font = totalFont;
    lastRow.fill = totalFill;
    formatCurrency(lastRow.getCell(4));
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  (worksheet.properties as any).created = new Date();
  workbook.creator = 'TricksLand Academy';

  return (await workbook.xlsx.writeBuffer()) as any;
}

/**
 * Generate Coach Payroll Export
 */
export async function exportCoachPayroll(month: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll');

  // Title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Coach Payroll Report - ${month}`;
  titleCell.font = { bold: true, size: 14 };

  // Headers
  const headerRow = worksheet.addRow([
    'Coach Name',
    'Sessions',
    'Hours',
    'Rate/Hr',
    'Earnings',
    'Bonuses',
    'Discounts',
    'Net Payable',
  ]);
  styleHeaderRow(headerRow);

  // Fetch data
  const data = await generateCoachPayrollReport(month);

  // Add data rows
  let totalEarnings = 0;
  let totalBonuses = 0;
  let totalDiscounts = 0;
  let totalPayable = 0;

  for (const record of data) {
    const row = worksheet.addRow([
      record.coach_name,
      record.total_sessions,
      record.total_hours,
      '-',
      record.total_earned,
      record.total_bonuses,
      record.total_discounts,
      record.net_payable,
    ]);

    // Format currency
    [5, 6, 7, 8].forEach((col) => formatCurrency(row.getCell(col)));

    totalEarnings += record.total_earned;
    totalBonuses += record.total_bonuses;
    totalDiscounts += record.total_discounts;
    totalPayable += record.net_payable;
  }

  // Add totals row
  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    totalEarnings,
    totalBonuses,
    totalDiscounts,
    totalPayable,
  ]);
  styleHeaderRow(totalRow);
  [5, 6, 7, 8].forEach((col) => formatCurrency(totalRow.getCell(col)));

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  (worksheet.properties as any).created = new Date();
  workbook.creator = 'TricksLand Academy';

  return (await workbook.xlsx.writeBuffer()) as any;
}

/**
 * Generate platform revenue summary export
 */
export async function exportRevenueSummary(month?: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Revenue');

  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Revenue Summary - ${month || 'All Time'}`;
  titleCell.font = { bold: true, size: 14 };

  // Fetch data
  const data = await generateRevenueSummaryReport(month);

  // Add data
  const rows = [
    ['Total Income', data.total_income],
    ['Total Expenses', data.total_expenses],
    ['Net Profit', data.net_profit],
    ['', ''],
    ['Number of Courses', data.num_courses],
    ['Number of Students', data.num_students],
    ['Payments Received', data.num_payments_received],
    ['Payments Pending', data.num_payments_pending],
  ];

  for (const [label, value] of rows) {
    const row = worksheet.addRow([label, value]);
    if (typeof label === 'string' && label && !['', 'Number of'].includes(label)) {
      row.font = { bold: true };
      if (typeof value === 'number' && (label.includes('Income') || label.includes('Expenses') || label.includes('Profit'))) {
        formatCurrency(row.getCell(2));
      }
    }
  }

  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  (worksheet.properties as any).created = new Date();
  workbook.creator = 'TricksLand Academy';

  return (await workbook.xlsx.writeBuffer()) as any;
}
