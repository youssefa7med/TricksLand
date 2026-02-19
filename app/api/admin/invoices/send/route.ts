import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

async function requireAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles' as any).select('role').eq('id', user.id).single();
    if ((profile as any)?.role !== 'admin') return null;
    return user;
}

function buildEmailHtml(params: {
    coachName: string;
    monthLabel: string;
    sessions: any[];
    adjustments: any[];
    grossTotal: number;
    totalBonuses: number;
    totalDiscounts: number;
    netTotal: number;
    sessionCount: number;
    appUrl: string;
    year: number;
}) {
    const { coachName, monthLabel, sessions, adjustments, grossTotal, totalBonuses, totalDiscounts, netTotal, sessionCount, appUrl, year } = params;

    const sessionsHtml = sessions.map((s: any) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${s.session_date}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${s.courses?.name || '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${s.start_time}–${s.end_time}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.computed_hours}h</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(s.applied_rate).toFixed(2)} EGP</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${Number(s.subtotal).toFixed(2)} EGP</strong></td>
        </tr>
    `).join('');

    const adjustmentsHtml = adjustments.length > 0 ? `
        <h3 style="color:#374151;margin-top:24px">Adjustments</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            ${adjustments.map((a: any) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">${a.notes || a.type}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
                        <span style="background:${a.type === 'bonus' ? '#d1fae5' : '#fee2e2'};color:${a.type === 'bonus' ? '#065f46' : '#991b1b'};padding:2px 8px;border-radius:4px">${a.type}</span>
                    </td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:${a.type === 'bonus' ? '#065f46' : '#991b1b'}">
                        ${a.type === 'bonus' ? '+' : '-'}${Number(a.amount).toFixed(2)} EGP
                    </td>
                </tr>
            `).join('')}
        </table>` : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#5BC0EB,#FF7A00);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:28px">TricksLand Academy</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Monthly Invoice — ${monthLabel}</p>
        </div>
        <div style="padding:32px">
            <p style="color:#374151">Hi <strong>${coachName}</strong>,</p>
            <p style="color:#6b7280">Here is your earnings breakdown for <strong>${monthLabel}</strong>.</p>
            <h3 style="color:#374151;margin-top:24px">Sessions (${sessionCount})</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
                <thead>
                    <tr style="background:#f3f4f6">
                        <th style="padding:8px;text-align:left;color:#6b7280">Date</th>
                        <th style="padding:8px;text-align:left;color:#6b7280">Course</th>
                        <th style="padding:8px;text-align:left;color:#6b7280">Time</th>
                        <th style="padding:8px;text-align:center;color:#6b7280">Hours</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Rate</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Amount</th>
                    </tr>
                </thead>
                <tbody>${sessionsHtml}</tbody>
            </table>
            ${adjustmentsHtml}
            <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-top:24px">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:4px 0;color:#6b7280">Gross Earnings</td>
                        <td style="padding:4px 0;text-align:right;color:#374151">${grossTotal.toFixed(2)} EGP</td>
                    </tr>
                    ${totalBonuses > 0 ? `<tr><td style="padding:4px 0;color:#065f46">Bonuses</td><td style="padding:4px 0;text-align:right;color:#065f46">+${totalBonuses.toFixed(2)} EGP</td></tr>` : ''}
                    ${totalDiscounts > 0 ? `<tr><td style="padding:4px 0;color:#991b1b">Discounts</td><td style="padding:4px 0;text-align:right;color:#991b1b">-${totalDiscounts.toFixed(2)} EGP</td></tr>` : ''}
                    <tr style="border-top:2px solid #e5e7eb">
                        <td style="padding:12px 0 4px;font-weight:700;font-size:18px;color:#111827">Net Payable</td>
                        <td style="padding:12px 0 4px;text-align:right;font-weight:700;font-size:20px;color:#FF7A00">${netTotal.toFixed(2)} EGP</td>
                    </tr>
                </table>
            </div>
            <p style="color:#9ca3af;font-size:13px;margin-top:32px">
                For questions about this invoice, contact your admin.<br>
                <a href="${appUrl}" style="color:#5BC0EB">${appUrl}</a>
            </p>
        </div>
        <div style="background:#f3f4f6;padding:16px;text-align:center">
            <p style="color:#9ca3af;font-size:12px;margin:0">© ${year} TricksLand Academy. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const adminEmail = process.env.ADMIN_EMAIL;

    // First attempt: send directly to the intended recipient
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'TricksLand Academy <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
        }),
    });
    const data = await res.json();

    // Resend blocks sending to non-owner emails without a verified domain.
    // Fall back: send to admin email with a forwarding note.
    if (!res.ok) {
        if (
            adminEmail &&
            to !== adminEmail &&
            typeof data.message === 'string' &&
            data.message.includes('testing emails')
        ) {
            const fallbackSubject = `[FOR: ${to}] ${subject}`;
            const fallbackHtml = `
                <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:24px;font-family:Arial,sans-serif">
                    <strong style="color:#856404">⚠ No verified domain — forwarding to admin</strong><br>
                    <span style="color:#856404;font-size:14px">
                        This invoice was intended for <strong>${to}</strong>.<br>
                        Please forward it to them, or verify a domain at
                        <a href="https://resend.com/domains" style="color:#856404">resend.com/domains</a>
                        to send directly.
                    </span>
                </div>
                ${html}`;

            const fallbackRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: 'TricksLand Academy <onboarding@resend.dev>',
                    to: [adminEmail],
                    subject: fallbackSubject,
                    html: fallbackHtml,
                }),
            });
            const fallbackData = await fallbackRes.json();
            if (!fallbackRes.ok) throw new Error(fallbackData.message || `Resend error: ${fallbackRes.status}`);
            return { ...fallbackData, sentToAdmin: true };
        }
        throw new Error(data.message || `Resend error: ${res.status}`);
    }

    return data;
}

// POST /api/admin/invoices/send
// Body: { month: "YYYY-MM", coach_id?: "uuid" }
export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { month, coach_id } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Invalid month format. Expected YYYY-MM' }, { status: 400 });
    }

    const supabaseAdmin = adminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const year = new Date().getFullYear();

    try {
        // Fetch monthly totals
        let totalsQuery = supabaseAdmin.from('coach_monthly_totals' as any).select('*').eq('month', month);
        if (coach_id) totalsQuery = totalsQuery.eq('coach_id', coach_id);
        const { data: totals, error: totalsError } = await totalsQuery;

        if (totalsError) return NextResponse.json({ error: totalsError.message }, { status: 500 });
        if (!totals || totals.length === 0) {
            return NextResponse.json({ message: 'No data for this month', emailsSent: [] });
        }

        const emailResults: { coachId: string; coachName: string; email: string; status: string }[] = [];

        for (const coachTotal of totals as any[]) {
            const { data: profile } = await supabaseAdmin.from('profiles' as any).select('email, full_name').eq('id', coachTotal.coach_id).single();
            if (!(profile as any)?.email) {
                emailResults.push({ coachId: coachTotal.coach_id, coachName: coachTotal.coach_name, email: 'unknown', status: 'skipped: no email' });
                continue;
            }
            const coachProfile = profile as any;

            const [{ data: sessions }, { data: adjustments }] = await Promise.all([
                            supabaseAdmin.from('sessions' as any)
                    .select('session_date, start_time, end_time, session_type, computed_hours, applied_rate, subtotal, notes, courses(name)')
                    .eq('paid_coach_id', coachTotal.coach_id)
                    .gte('session_date', `${month}-01`)
                    .lt('session_date', new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 1).toISOString().split('T')[0])
                    .order('session_date'),
                supabaseAdmin.from('adjustments' as any)
                    .select('type, amount, notes')
                    .eq('coach_id', coachTotal.coach_id)
                    .eq('month', month),
            ]);

            const monthLabel = new Date(month + '-02').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            const html = buildEmailHtml({
                coachName: coachProfile.full_name,
                monthLabel,
                sessions: sessions || [],
                adjustments: adjustments || [],
                grossTotal: Number(coachTotal.gross_total),
                totalBonuses: Number(coachTotal.total_bonuses),
                totalDiscounts: Number(coachTotal.total_discounts),
                netTotal: Number(coachTotal.net_total),
                sessionCount: Number(coachTotal.session_count),
                appUrl,
                year,
            });

            try {
                const result = await sendEmail(coachProfile.email, `Your Invoice for ${monthLabel} — TricksLand Academy`, html);
                emailResults.push({
                    coachId: coachTotal.coach_id,
                    coachName: coachTotal.coach_name,
                    email: coachProfile.email,
                    status: result.sentToAdmin ? 'sent-to-admin' : 'sent',
                });
            } catch (e: any) {
                emailResults.push({ coachId: coachTotal.coach_id, coachName: coachTotal.coach_name, email: coachProfile.email, status: `error: ${e.message}` });
            }
        }

        return NextResponse.json({ success: true, emailsSent: emailResults });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
