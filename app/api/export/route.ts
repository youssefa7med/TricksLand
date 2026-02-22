import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if ((profile as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { type, data, month, filters } = await request.json();

        const workbook = new ExcelJS.Workbook();
        (workbook as any).creator = 'TricksLand Academy';
        (workbook as any).created = new Date();

        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
            fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
            alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        };

        const addMetaRow = (ws: ExcelJS.Worksheet, label: string, value: string) => {
            const row = ws.addRow([label, value]);
            row.getCell(1).font = { bold: true };
        };

        switch (type) {
            case 'student-attendance': {
                const ws = workbook.addWorksheet('Student Attendance');
                addMetaRow(ws, 'Report', 'Student Monthly Attendance');
                addMetaRow(ws, 'Month', month);
                addMetaRow(ws, 'Generated', new Date().toLocaleString());
                ws.addRow([]);

                const header = ws.addRow(['Student', 'Course', 'Total Sessions', 'Present', 'Absent', 'Late', 'Attendance Rate']);
                header.eachCell(cell => Object.assign(cell, headerStyle));
                ws.columns = [
                    { width: 25 }, { width: 25 }, { width: 15 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 16 },
                ];
                for (const r of data) {
                    ws.addRow([r.student_name, r.course_name, r.total_sessions, r.sessions_attended, r.sessions_absent, r.sessions_late, `${r.attendance_percentage}%`]);
                }
                break;
            }

            case 'financial': {
                const ws = workbook.addWorksheet('Financial Summary');
                addMetaRow(ws, 'Report', 'Course Financial Summary');
                addMetaRow(ws, 'Generated', new Date().toLocaleString());
                ws.addRow([]);

                const header = ws.addRow(['Course', 'Students', 'Total Fees', 'Collected', 'Pending', 'Expenses', 'Net Profit', 'Paid', 'Partial', 'Not Paid']);
                header.eachCell(cell => Object.assign(cell, headerStyle));
                ws.columns = [
                    { width: 25 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 8 }, { width: 10 },
                ];
                let totalIncome = 0, totalExpenses = 0, totalProfit = 0;
                for (const r of data) {
                    ws.addRow([r.course_name, r.total_students, r.total_course_fees, r.total_income, r.pending_income, r.total_expenses, r.net_profit, r.students_paid, r.students_partially_paid, r.students_not_paid]);
                    totalIncome += Number(r.total_income);
                    totalExpenses += Number(r.total_expenses);
                    totalProfit += Number(r.net_profit);
                }
                ws.addRow([]);
                const totRow = ws.addRow(['TOTAL', '', '', totalIncome, '', totalExpenses, totalProfit]);
                totRow.font = { bold: true };
                break;
            }

            case 'coach-payroll': {
                const ws = workbook.addWorksheet('Coach Payroll');
                addMetaRow(ws, 'Report', 'Coach Monthly Payroll');
                addMetaRow(ws, 'Month', month);
                addMetaRow(ws, 'Generated', new Date().toLocaleString());
                ws.addRow([]);

                const header = ws.addRow(['Coach', 'Sessions', 'Hours', 'Gross', 'Bonuses', 'Discounts', 'Net Payable']);
                header.eachCell(cell => Object.assign(cell, headerStyle));
                ws.columns = [{ width: 25 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
                let totalNet = 0;
                for (const r of data) {
                    ws.addRow([r.coach_name, r.session_count, r.total_hours, r.gross_total, r.total_bonuses, r.total_discounts, r.net_total]);
                    totalNet += Number(r.net_total);
                }
                ws.addRow([]);
                const totRow = ws.addRow(['TOTAL', '', '', '', '', '', totalNet]);
                totRow.font = { bold: true };
                break;
            }

            case 'course-attendance': {
                const ws = workbook.addWorksheet('Course Attendance');
                addMetaRow(ws, 'Report', 'Course Attendance Summary');
                addMetaRow(ws, 'Month', month);
                addMetaRow(ws, 'Generated', new Date().toLocaleString());
                ws.addRow([]);

                const header = ws.addRow(['Course', 'Students', 'Total Sessions', 'Attended', 'Avg Rate']);
                header.eachCell(cell => Object.assign(cell, headerStyle));
                ws.columns = [{ width: 25 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 12 }];
                for (const r of data) {
                    ws.addRow([r.course_name, r.total_students, r.total_sessions, r.total_attended, `${r.avg_rate}%`]);
                }
                break;
            }

            default: {
                // Generic export for any data
                const ws = workbook.addWorksheet('Report');
                addMetaRow(ws, 'Report Type', type);
                addMetaRow(ws, 'Month', month);
                addMetaRow(ws, 'Generated', new Date().toLocaleString());
                ws.addRow([]);

                if (data.length > 0) {
                    const keys = Object.keys(data[0]);
                    const header = ws.addRow(keys.map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())));
                    header.eachCell(cell => Object.assign(cell, headerStyle));
                    ws.columns = keys.map(() => ({ width: 18 }));
                    for (const r of data) {
                        ws.addRow(keys.map(k => r[k] ?? ''));
                    }
                }
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="tricksland-${type}-${month}.xlsx"`,
            },
        });
    } catch (err) {
        console.error('Export error:', err);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
