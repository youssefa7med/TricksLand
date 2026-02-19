// Supabase Edge Function — send-invoices
// Deno runtime (no npm imports)
//
// Invocation: POST /functions/v1/send-invoices
// Body: { "month": "YYYY-MM", "coach_id"?: "uuid" }
//   - Omit coach_id to send for ALL coaches that have sessions in the month
//   - Include coach_id to send for a single coach only
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ADMIN_EMAIL, APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── 1. Auth check (must be admin) ─────────────────────────────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // Verify the calling user is admin
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { global: { headers: { Authorization: authHeader } } },
        );

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) throw new Error('Unauthorized');

        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (callerProfile?.role !== 'admin') throw new Error('Forbidden: admin only');

        // ── 2. Parse body ─────────────────────────────────────────────────────
        const body = await req.json();
        const month: string = body.month; // "YYYY-MM"
        const singleCoachId: string | undefined = body.coach_id;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            throw new Error('Invalid month format. Expected YYYY-MM');
        }

        // ── 3. Fetch monthly totals ───────────────────────────────────────────
        let totalsQuery = supabaseAdmin
            .from('coach_monthly_totals')
            .select('*')
            .eq('month', month);

        if (singleCoachId) totalsQuery = totalsQuery.eq('coach_id', singleCoachId);

        const { data: totals, error: totalsError } = await totalsQuery;
        if (totalsError) throw new Error(totalsError.message);
        if (!totals || totals.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No data found for this month', emailsSent: [] }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── 4. For each coach: fetch sessions + adjustments, send email ───────
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
        const appUrl = Deno.env.get('APP_URL') || '';

        if (!resendApiKey) throw new Error('RESEND_API_KEY secret not configured');

        const emailResults: { coachId: string; coachName: string; email: string; status: string }[] = [];

        for (const coachTotal of totals) {
            // Fetch coach email from profiles
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name')
                .eq('id', coachTotal.coach_id)
                .single();

            if (!profile?.email) {
                emailResults.push({
                    coachId: coachTotal.coach_id,
                    coachName: coachTotal.coach_name,
                    email: 'unknown',
                    status: 'skipped: no email',
                });
                continue;
            }

            // Fetch session breakdown
            const { data: sessions } = await supabaseAdmin
                .from('sessions')
                .select('session_date, start_time, end_time, session_type, computed_hours, applied_rate, subtotal, notes, courses!sessions_course_id_fkey(name)')
                .eq('paid_coach_id', coachTotal.coach_id)
                .gte('session_date', `${month}-01`)
                .lte('session_date', `${month}-31`)
                .order('session_date');

            // Fetch adjustments
            const { data: adjustments } = await supabaseAdmin
                .from('adjustments')
                .select('type, amount, notes')
                .eq('coach_id', coachTotal.coach_id)
                .eq('month', month);

            // Build email HTML
            const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', {
                year: 'numeric', month: 'long',
            });

            const sessionsHtml = (sessions || []).map((s: any) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">${s.session_date}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee">${s.courses?.name || '-'}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee">${s.start_time}–${s.end_time}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.computed_hours}h</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(s.applied_rate).toFixed(2)}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>$${Number(s.subtotal).toFixed(2)}</strong></td>
                </tr>
            `).join('');

            const adjustmentsHtml = (adjustments || []).length > 0
                ? `
                <h3 style="color:#374151;margin-top:24px">Adjustments</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                    ${(adjustments || []).map((a: any) => `
                        <tr>
                            <td style="padding:8px;border-bottom:1px solid #eee">${a.notes}</td>
                            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
                                <span style="background:${a.type === 'bonus' ? '#d1fae5' : '#fee2e2'};color:${a.type === 'bonus' ? '#065f46' : '#991b1b'};padding:2px 8px;border-radius:4px">
                                    ${a.type}
                                </span>
                            </td>
                            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:${a.type === 'bonus' ? '#065f46' : '#991b1b'}">
                                ${a.type === 'bonus' ? '+' : '-'}$${Number(a.amount).toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </table>`
                : '';

            const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#5BC0EB,#FF7A00);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:28px">TricksLand Academy</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Monthly Invoice — ${monthLabel}</p>
        </div>

        <!-- Body -->
        <div style="padding:32px">
            <p style="color:#374151">Hi <strong>${profile.full_name}</strong>,</p>
            <p style="color:#6b7280">Here is your earnings breakdown for <strong>${monthLabel}</strong>.</p>

            <!-- Sessions -->
            <h3 style="color:#374151;margin-top:24px">Sessions (${coachTotal.session_count})</h3>
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
                <tbody>
                    ${sessionsHtml}
                </tbody>
            </table>

            ${adjustmentsHtml}

            <!-- Summary -->
            <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-top:24px">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:4px 0;color:#6b7280">Gross Earnings</td>
                        <td style="padding:4px 0;text-align:right;color:#374151">$${Number(coachTotal.gross_total).toFixed(2)}</td>
                    </tr>
                    ${Number(coachTotal.total_bonuses) > 0 ? `
                    <tr>
                        <td style="padding:4px 0;color:#065f46">Bonuses</td>
                        <td style="padding:4px 0;text-align:right;color:#065f46">+$${Number(coachTotal.total_bonuses).toFixed(2)}</td>
                    </tr>` : ''}
                    ${Number(coachTotal.total_discounts) > 0 ? `
                    <tr>
                        <td style="padding:4px 0;color:#991b1b">Discounts</td>
                        <td style="padding:4px 0;text-align:right;color:#991b1b">-$${Number(coachTotal.total_discounts).toFixed(2)}</td>
                    </tr>` : ''}
                    <tr style="border-top:2px solid #e5e7eb">
                        <td style="padding:12px 0 4px;font-weight:700;font-size:18px;color:#111827">Net Payable</td>
                        <td style="padding:12px 0 4px;text-align:right;font-weight:700;font-size:20px;color:#FF7A00">$${Number(coachTotal.net_total).toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            <p style="color:#9ca3af;font-size:13px;margin-top:32px">
                For questions about this invoice, please contact your admin.<br>
                <a href="${appUrl}" style="color:#5BC0EB">${appUrl}</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#f3f4f6;padding:16px;text-align:center">
            <p style="color:#9ca3af;font-size:12px;margin:0">© ${new Date().getFullYear()} TricksLand Academy. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

            // Send via Resend
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `TricksLand Academy <onboarding@resend.dev>`,
                    to: [profile.email],
                    subject: `Your Invoice for ${monthLabel} — TricksLand Academy`,
                    html: emailHtml,
                }),
            });

            const resendData = await resendRes.json();
            emailResults.push({
                coachId: coachTotal.coach_id,
                coachName: coachTotal.coach_name,
                email: profile.email,
                status: resendRes.ok ? 'sent' : `error: ${resendData.message}`,
            });
        }

        // ── 5. Send admin summary email ───────────────────────────────────────
        if (adminEmail) {
            const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', {
                year: 'numeric', month: 'long',
            });
            const grandTotal = totals.reduce((sum: number, t: any) => sum + Number(t.net_total), 0);

            const summaryRows = totals.map((t: any) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">${t.coach_name}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${t.session_count}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(t.total_hours).toFixed(1)}h</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(t.gross_total).toFixed(2)}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#065f46">+$${Number(t.total_bonuses).toFixed(2)}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#991b1b">-$${Number(t.total_discounts).toFixed(2)}</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:700">$${Number(t.net_total).toFixed(2)}</td>
                </tr>
            `).join('');

            const adminHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
    <div style="max-width:800px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#5BC0EB,#FF7A00);padding:32px">
            <h1 style="color:#fff;margin:0">Admin Summary — ${monthLabel}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Total Payout: <strong>$${grandTotal.toFixed(2)}</strong></p>
        </div>
        <div style="padding:32px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
                <thead>
                    <tr style="background:#f3f4f6">
                        <th style="padding:8px;text-align:left;color:#6b7280">Coach</th>
                        <th style="padding:8px;text-align:center;color:#6b7280">Sessions</th>
                        <th style="padding:8px;text-align:center;color:#6b7280">Hours</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Gross</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Bonuses</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Discounts</th>
                        <th style="padding:8px;text-align:right;color:#6b7280">Net</th>
                    </tr>
                </thead>
                <tbody>${summaryRows}</tbody>
                <tfoot>
                    <tr style="background:#f9fafb;font-weight:700">
                        <td style="padding:12px 8px" colspan="6">Total Payout</td>
                        <td style="padding:12px 8px;text-align:right;font-size:18px;color:#FF7A00">$${grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px">
                <a href="${Deno.env.get('APP_URL') || ''}/admin/invoices" style="color:#5BC0EB">View in Dashboard →</a>
            </p>
        </div>
    </div>
</body>
</html>`;

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `TricksLand Academy <onboarding@resend.dev>`,
                    to: [adminEmail],
                    subject: `Invoice Summary for ${monthLabel} — TricksLand Academy`,
                    html: adminHtml,
                }),
            });
        }

        // ── 6. Return results ─────────────────────────────────────────────────
        return new Response(
            JSON.stringify({ success: true, emailsSent: emailResults }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
