'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Course {
    id: string;
    name: string;
}

interface CourseFeeItem {
    id: string;
    name: string;
    amount: number;
    sort_order: number;
}

interface CourseSummary {
    course_id: string;
    course_name: string;
    total_course_fees: number;
    total_income: number;
    pending_income: number;
    total_expenses: number;
    net_profit: number;
    total_students: number;
    students_paid: number;
    students_partially_paid: number;
    students_not_paid: number;
}

interface StudentPayment {
    id: string;
    student_id: string;
    fee_item_id: string | null;
    course_fee: number;
    amount_paid: number;
    remaining_balance: number;
    payment_status: 'not_paid' | 'partially_paid' | 'paid';
    due_date: string | null;
    notes: string | null;
    students: { full_name: string };
    course_fee_items: { name: string } | null;
}

interface Expense {
    id: string;
    title: string;
    amount: number;
    expense_date: string;
    category: string;
    description: string | null;
}

interface PaymentTransaction {
    id: string;
    payment_record_id: string;
    amount: number;
    payment_method: string;
    notes: string | null;
    created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
    paid: 'bg-green-500/20 text-green-400',
    partially_paid: 'bg-yellow-500/20 text-yellow-400',
    not_paid: 'bg-red-500/20 text-red-400',
};

export default function AdminFinancialPage() {
    const supabase = createClient();
    const t = useTranslations('pages.financial');
    const tc = useTranslations('common');

    const [courses, setCourses] = useState<Course[]>([]);
    const [summaries, setSummaries] = useState<CourseSummary[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [payments, setPayments] = useState<StudentPayment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [courseStudents, setCourseStudents] = useState<{ id: string; full_name: string }[]>([]);
    const [transactions, setTransactions] = useState<Record<string, PaymentTransaction[]>>({});
    const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
    const [tab, setTab] = useState<'overview' | 'payments' | 'expenses'>('overview');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fee items for the selected course
    const [feeItems, setFeeItems] = useState<CourseFeeItem[]>([]);

    // Payment form
    const [payForm, setPayForm] = useState({ studentId: '', feeItemId: '', courseFee: '', dueDate: '', notes: '' });
    const [showPayForm, setShowPayForm] = useState(false);

    // Payment recording form (add payment to existing record)
    const [recordForm, setRecordForm] = useState({ paymentId: '', amount: '', method: 'cash', notes: '' });
    const [showRecordForm, setShowRecordForm] = useState(false);

    // Expense form
    const [expForm, setExpForm] = useState({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'other', description: '' });
    const [showExpForm, setShowExpForm] = useState(false);

    // Load courses + summaries
    const loadSummaries = useCallback(async () => {
        const [{ data: coursesData }, { data: summaryData }] = await Promise.all([
            supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
            (supabase as any).from('course_financial_summary').select('*').order('course_name'),
        ]);
        setCourses(coursesData || []);
        setSummaries(summaryData || []);
    }, [supabase]);

    useEffect(() => {
        const load = async () => {
            await loadSummaries();
            setLoading(false);
        };
        load();
    }, [loadSummaries]);

    const loadCourseData = useCallback(async (courseId: string) => {
        if (!courseId) {
            setPayments([]);
            setExpenses([]);
            setCourseStudents([]);
            setFeeItems([]);
            setTransactions({});
            return;
        }
        const [{ data: paymentsData }, { data: expensesData }, { data: enrolledData }, { data: feeItemsData }] = await Promise.all([
            (supabase as any)
                .from('student_payments')
                .select('id, student_id, fee_item_id, course_fee, amount_paid, remaining_balance, payment_status, due_date, notes, students(full_name), course_fee_items(name)')
                .eq('course_id', courseId)
                .order('created_at', { ascending: false }),
            (supabase as any)
                .from('course_expenses')
                .select('id, title, amount, expense_date, category, description')
                .eq('course_id', courseId)
                .order('expense_date', { ascending: false }),
            (supabase as any)
                .from('course_students')
                .select('student_id, students(id, full_name)')
                .eq('course_id', courseId),
            (supabase as any)
                .from('course_fee_items')
                .select('id, name, amount, sort_order')
                .eq('course_id', courseId)
                .order('sort_order'),
        ]);
        setPayments(paymentsData || []);
        setExpenses(expensesData || []);
        setFeeItems(feeItemsData || []);
        // Build list of enrolled students (id + full_name)
        const enrolled: { id: string; full_name: string }[] = (enrolledData || []).map((r: any) => ({
            id: r.student_id,
            full_name: r.students?.full_name || 'Unknown',
        }));
        setCourseStudents(enrolled);

        // Fetch transactions for all payment records
        if (paymentsData && paymentsData.length > 0) {
            const paymentIds = paymentsData.map((p: any) => p.id);
            const { data: txData } = await (supabase as any)
                .from('payment_transactions')
                .select('id, payment_record_id, amount, payment_method, notes, created_at')
                .in('payment_record_id', paymentIds)
                .order('created_at', { ascending: false });
            if (txData) {
                const txMap: Record<string, PaymentTransaction[]> = {};
                for (const tx of txData) {
                    if (!txMap[tx.payment_record_id]) txMap[tx.payment_record_id] = [];
                    txMap[tx.payment_record_id].push(tx);
                }
                setTransactions(txMap);
            }
        } else {
            setTransactions({});
        }
    }, [supabase]);

    useEffect(() => {
        if (selectedCourse) loadCourseData(selectedCourse);
    }, [selectedCourse, loadCourseData]);

    const handleAddPaymentRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        const insertData: Record<string, unknown> = {
            student_id: payForm.studentId,
            course_id: selectedCourse,
            course_fee: parseFloat(payForm.courseFee),
            due_date: payForm.dueDate || null,
            notes: payForm.notes || null,
            created_by: user?.id,
        };
        if (payForm.feeItemId) {
            insertData.fee_item_id = payForm.feeItemId;
        }

        // Check if a record already exists for this student + course + fee_item combo.
        // We can't use upsert() because there is no DB unique constraint on these columns.
        let existingQuery = (supabase as any)
            .from('student_payments')
            .select('id')
            .eq('student_id', payForm.studentId)
            .eq('course_id', selectedCourse);
        if (payForm.feeItemId) {
            existingQuery = existingQuery.eq('fee_item_id', payForm.feeItemId);
        } else {
            existingQuery = existingQuery.is('fee_item_id', null);
        }
        const { data: existing } = await existingQuery.maybeSingle();

        let error: any;
        if (existing) {
            ({ error } = await (supabase as any)
                .from('student_payments')
                .update({
                    course_fee: parseFloat(payForm.courseFee),
                    due_date: payForm.dueDate || null,
                    notes: payForm.notes || null,
                })
                .eq('id', existing.id));
        } else {
            ({ error } = await (supabase as any)
                .from('student_payments')
                .insert(insertData));
        }

        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success(t('paymentRecordSaved'));
        setShowPayForm(false);
        setPayForm({ studentId: '', feeItemId: '', courseFee: '', dueDate: '', notes: '' });
        await loadCourseData(selectedCourse);
        await loadSummaries();
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const payment = payments.find(p => p.id === recordForm.paymentId);
        const amount = parseFloat(recordForm.amount);

        // Guard: cannot pay more than what is remaining
        if (payment && amount > Number(payment.remaining_balance)) {
            toast.error(`Amount exceeds remaining balance of ${formatCurrency(payment.remaining_balance)}`);
            return;
        }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from('payment_transactions').insert({
            payment_record_id: recordForm.paymentId,
            amount: parseFloat(recordForm.amount),
            payment_method: recordForm.method,
            notes: recordForm.notes || null,
            created_by: user?.id,
        });
        setSaving(false);
        if (error) { toast.error(error.message); return; }

        // Update amount_paid directly
        if (payment) {
            const newAmount = payment.amount_paid + parseFloat(recordForm.amount);
            await (supabase as any).from('student_payments').update({
                amount_paid: newAmount,
                last_payment_date: new Date().toISOString().split('T')[0],
                payment_status: newAmount >= payment.course_fee ? 'paid' : newAmount > 0 ? 'partially_paid' : 'not_paid',
            }).eq('id', recordForm.paymentId);
        }

        toast.success(t('paymentRecorded'));
        setShowRecordForm(false);
        setRecordForm({ paymentId: '', amount: '', method: 'cash', notes: '' });
        await loadCourseData(selectedCourse);
        await loadSummaries();
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from('course_expenses').insert({
            course_id: selectedCourse,
            title: expForm.title,
            amount: parseFloat(expForm.amount),
            expense_date: expForm.date,
            category: expForm.category,
            description: expForm.description || null,
            created_by: user?.id,
        });
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success(t('expenseAdded'));
        setShowExpForm(false);
        setExpForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'other', description: '' });
        await loadCourseData(selectedCourse);
        loadSummaries();
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm(t('deleteExpenseConfirm'))) return;
        await (supabase as any).from('course_expenses').delete().eq('id', id);
        toast.success(t('expenseDeleted'));
        await loadCourseData(selectedCourse);
        await loadSummaries();
    };

    const handleDeleteTransaction = async (tx: PaymentTransaction) => {
        if (!confirm(t('deleteTransactionConfirm'))) return;
        setSaving(true);
        // Delete transaction
        const { error } = await (supabase as any).from('payment_transactions').delete().eq('id', tx.id);
        if (error) { setSaving(false); toast.error(error.message); return; }
        // Update payment record: subtract the refunded amount
        const payment = payments.find(p => p.id === tx.payment_record_id);
        if (payment) {
            const newAmount = Math.max(0, Number(payment.amount_paid) - Number(tx.amount));
            const newStatus = newAmount <= 0 ? 'not_paid' : newAmount < Number(payment.course_fee) ? 'partially_paid' : 'paid';
            await (supabase as any).from('student_payments').update({
                amount_paid: newAmount,
                payment_status: newStatus,
            }).eq('id', tx.payment_record_id);
        }
        setSaving(false);
        toast.success(t('transactionDeleted'));
        await loadCourseData(selectedCourse);
        await loadSummaries();
    };

    const selectedSummary = summaries.find(s => s.course_id === selectedCourse);

    // Compute course-level stats from already-loaded local state (always up-to-date)
    const localTotalIncome = payments.reduce((a, p) => a + Number(p.amount_paid), 0);
    const localPendingIncome = payments.reduce((a, p) => a + Number(p.remaining_balance), 0);
    const localTotalExpenses = expenses.reduce((a, e) => a + Number(e.amount), 0);
    const localNetProfit = localTotalIncome - localTotalExpenses;

    const inputClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary';
    const labelClass = 'block text-white/70 text-xs mb-1';

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-white/60 text-sm mt-1">{t('subtitle')}</p>
            </div>

            {/* Platform overview cards */}
            {!loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: t('totalIncome'), value: formatCurrency(summaries.reduce((a, s) => a + Number(s.total_income), 0)), color: 'text-green-400' },
                        { label: t('pendingIncome'), value: formatCurrency(summaries.reduce((a, s) => a + Number(s.pending_income), 0)), color: 'text-yellow-400' },
                        { label: t('totalExpenses'), value: formatCurrency(summaries.reduce((a, s) => a + Number(s.total_expenses), 0)), color: 'text-red-400' },
                        { label: t('netProfit'), value: formatCurrency(summaries.reduce((a, s) => a + Number(s.net_profit), 0)), color: 'text-primary' },
                    ].map(card => (
                        <GlassCard key={card.label} className="p-4">
                            <p className="text-white/50 text-xs">{card.label}</p>
                            <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Course selector */}
            <GlassCard className="p-4">
                <label className={labelClass}>{t('selectCourse')}</label>
                <select value={selectedCourse} onChange={e => {
                    setSelectedCourse(e.target.value);
                    setTab('overview');
                    // Clear all course-specific data immediately so stale data from
                    // the previous course is never shown while new data loads
                    setPayments([]);
                    setExpenses([]);
                    setCourseStudents([]);
                    setFeeItems([]);
                    setTransactions({});
                    setExpandedPayment(null);
                    setShowPayForm(false);
                    setShowRecordForm(false);
                    setShowExpForm(false);
                }}
                    className={inputClass}>
                    <option value="">{t('allCoursesOverview')}</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </GlassCard>

            {/* All courses overview */}
            {!selectedCourse && (
                <GlassCard className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-white/50 border-b border-white/10">
                                <th className="text-left p-4">{t('courseCol')}</th>
                                <th className="text-right p-4">{t('studentsCol')}</th>
                                <th className="text-right p-4">{t('incomeCol')}</th>
                                <th className="text-right p-4">{t('pendingCol')}</th>
                                <th className="text-right p-4">{t('expensesCol')}</th>
                                <th className="text-right p-4">{t('netProfitCol')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaries.map(s => (
                                <tr key={s.course_id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                    onClick={() => setSelectedCourse(s.course_id)}>
                                    <td className="p-4 text-white font-medium">{s.course_name}</td>
                                    <td className="p-4 text-right text-white/80">{s.total_students}</td>
                                    <td className="p-4 text-right text-green-400">{formatCurrency(s.total_income)}</td>
                                    <td className="p-4 text-right text-yellow-400">{formatCurrency(s.pending_income)}</td>
                                    <td className="p-4 text-right text-red-400">{formatCurrency(s.total_expenses)}</td>
                                    <td className={`p-4 text-right font-semibold ${Number(s.net_profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(s.net_profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </GlassCard>
            )}

            {/* Course detail */}
            {selectedCourse && (
                <>
                    {/* Course summary cards */}
                    {selectedCourse && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: t('totalStudents'), value: courseStudents.length, color: 'text-white' },
                                { label: t('collected'), value: formatCurrency(localTotalIncome), color: 'text-green-400' },
                                { label: t('expensesCol'), value: formatCurrency(localTotalExpenses), color: 'text-red-400' },
                                { label: t('netProfit'), value: formatCurrency(localNetProfit), color: localNetProfit >= 0 ? 'text-green-400' : 'text-red-400' },
                            ].map(card => (
                                <GlassCard key={card.label} className="p-4">
                                    <p className="text-white/50 text-xs">{card.label}</p>
                                    <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2">
                        {(['payments', 'expenses'] as const).map(tabKey => (
                            <button key={tabKey} onClick={() => setTab(tabKey)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === tabKey ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                                {tabKey === 'payments' ? `💳 ${t('paymentsTab')}` : `📋 ${t('expensesTab')}`}
                            </button>
                        ))}
                    </div>

                    {/* PAYMENTS TAB */}
                    {tab === 'payments' && (
                        <GlassCard className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-semibold">{t('paymentsTab')}</h3>
                                <button onClick={() => setShowPayForm(!showPayForm)}
                                    className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                                    + {t('addPaymentRecord')}
                                </button>
                            </div>

                            {/* Fee items summary chips */}
                            {feeItems.length > 0 && (
                                <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
                                    {feeItems.map(fi => {
                                        const fiPayments = payments.filter(p => p.fee_item_id === fi.id);
                                        const collected = fiPayments.reduce((a, p) => a + Number(p.amount_paid), 0);
                                        const total = fiPayments.reduce((a, p) => a + Number(p.course_fee), 0);
                                        return (
                                            <div key={fi.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs">
                                                <span className="text-primary font-medium">{fi.name}</span>
                                                <span className="text-white/40 mx-1">·</span>
                                                <span className="text-green-400">{formatCurrency(collected)} {t('feeItemCollectedOf')}</span>
                                                {total > 0 && <span className="text-white/30"> / {formatCurrency(total)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add payment record form */}
                            {showPayForm && (
                                <form onSubmit={handleAddPaymentRecord} className="bg-white/5 rounded-xl p-4 space-y-3">
                                    <h4 className="text-white text-sm font-semibold">{t('newPaymentRecord')}</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>{t('studentLabel')}</label>
                                            <select value={payForm.studentId} onChange={e => setPayForm(p => ({ ...p, studentId: e.target.value }))}
                                                required className={inputClass}>
                                                <option value="">{t('selectStudentPlaceholder')}</option>
                                                {courseStudents
                                                    .filter(s => {
                                                        // If a fee item is selected, only hide students who already paid that item
                                                        if (payForm.feeItemId) {
                                                            return !payments.some(p => p.student_id === s.id && p.fee_item_id === payForm.feeItemId);
                                                        }
                                                        // Legacy: hide students with a general (no fee item) record
                                                        return !payments.some(p => p.student_id === s.id && !p.fee_item_id);
                                                    })
                                                    .map(s => (
                                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                        {feeItems.length > 0 && (
                                            <div>
                                                <label className={labelClass}>{t('feeItemLabel')} <span className="text-white/30">{t('feeItemOptional')}</span></label>
                                                <select
                                                    value={payForm.feeItemId}
                                                    onChange={e => {
                                                        const fi = feeItems.find(f => f.id === e.target.value);
                                                        setPayForm(p => ({
                                                            ...p,
                                                            feeItemId: e.target.value,
                                                            courseFee: fi ? String(fi.amount) : p.courseFee,
                                                        }));
                                                    }}
                                                    className={inputClass}
                                                >
                                                    <option value="">— {t('feeItemGeneralOther')} —</option>
                                                    {feeItems.map(fi => (
                                                        <option key={fi.id} value={fi.id}>{fi.name} ({fi.amount} EGP)</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className={labelClass}>{t('courseFeeLabel')}</label>
                                            <input type="number" min="1" step="0.01" required value={payForm.courseFee}
                                                onChange={e => setPayForm(p => ({ ...p, courseFee: e.target.value }))}
                                                className={inputClass} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('dueDateLabel')}</label>
                                            <input type="date" value={payForm.dueDate}
                                                onChange={e => setPayForm(p => ({ ...p, dueDate: e.target.value }))}
                                                className={inputClass} />
                                        </div>
                                        <div className={feeItems.length > 0 ? '' : 'col-span-2'}>
                                            <label className={labelClass}>{tc('notes')}</label>
                                            <input value={payForm.notes}
                                                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                                                className={inputClass} placeholder={t('optionalPlaceholder')} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setShowPayForm(false)}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">{tc('cancel')}</button>
                                        <button type="submit" disabled={saving}
                                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">
                                            {saving ? tc('saving') : tc('save')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Record payment form */}
                            {showRecordForm && (() => {
                                const activePayment = payments.find(p => p.id === recordForm.paymentId);
                                const remaining = activePayment ? Number(activePayment.remaining_balance) : 0;
                                return (
                                <form onSubmit={handleRecordPayment} className="bg-white/5 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-white text-sm font-semibold">{t('recordPayment')}</h4>
                                        <span className="text-xs text-yellow-400">{t('remainingLabel')}: {formatCurrency(remaining)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>{t('amountLabel')}</label>
                                            <input type="number" min="0.01" step="0.01" required
                                                max={remaining}
                                                value={recordForm.amount}
                                                onChange={e => setRecordForm(p => ({ ...p, amount: e.target.value }))}
                                                className={inputClass} placeholder="0.00" />
                                            {parseFloat(recordForm.amount) > remaining && (
                                                <p className="text-red-400 text-xs mt-1">{t('exceedsBalance', { amount: formatCurrency(remaining) })}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('methodLabel')}</label>
                                            <select value={recordForm.method} onChange={e => setRecordForm(p => ({ ...p, method: e.target.value }))}
                                                className={inputClass}>
                                                <option value="cash">{t('methodCash')}</option>
                                                <option value="bank_transfer">{t('methodBankTransfer')}</option>
                                                <option value="card">{t('methodCard')}</option>
                                                <option value="check">{t('methodCheck')}</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelClass}>{tc('notes')}</label>
                                            <input value={recordForm.notes}
                                                onChange={e => setRecordForm(p => ({ ...p, notes: e.target.value }))}
                                                className={inputClass} placeholder={t('optionalPlaceholder')} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setShowRecordForm(false)}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">{tc('cancel')}</button>
                                        <button type="submit" disabled={saving || parseFloat(recordForm.amount || '0') > remaining}
                                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">
                                            {saving ? tc('saving') : t('recordPayment')}
                                        </button>
                                    </div>
                                </form>
                                );
                            })()}

                            {/* Payments table */}
                            {payments.length === 0 ? (
                                <div className="py-8 text-center text-white/50">{tc('noData')}</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-white/50 border-b border-white/10">
                                                <th className="text-left py-2 px-3">{tc('name')}</th>
                                                {feeItems.length > 0 && <th className="text-left py-2 px-3">{t('feeItemLabel')}</th>}
                                                <th className="text-right py-2 px-3">{t('incomeCol')}</th>
                                                <th className="text-right py-2 px-3">{tc('paid')}</th>
                                                <th className="text-right py-2 px-3">{tc('pending')}</th>
                                                <th className="text-center py-2 px-3">{tc('status')}</th>
                                                <th className="text-center py-2 px-3">{tc('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <React.Fragment key={p.id}>
                                                <tr className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 px-3 text-white font-medium">
                                                        {(p.students as any)?.full_name || '—'}
                                                    </td>
                                                    {feeItems.length > 0 && (
                                                        <td className="py-3 px-3 text-white/60 text-xs">
                                                            {p.fee_item_id && (p as any).course_fee_items?.name
                                                                ? <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{(p as any).course_fee_items.name}</span>
                                                                : <span className="text-white/30">{t('feeItemGeneral')}</span>
                                                            }
                                                        </td>
                                                    )}
                                                    <td className="py-3 px-3 text-right text-white/80">{formatCurrency(p.course_fee)}</td>
                                                    <td className="py-3 px-3 text-right text-green-400">{formatCurrency(p.amount_paid)}</td>
                                                    <td className="py-3 px-3 text-right text-yellow-400">{formatCurrency(p.remaining_balance)}</td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.payment_status]}`}>
                                                            {p.payment_status === 'paid' ? tc('paid') : p.payment_status === 'partially_paid' ? tc('partial') : tc('notPaid')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                        {p.payment_status !== 'paid' && (
                                                            <button
                                                                onClick={() => { setRecordForm(r => ({ ...r, paymentId: p.id })); setShowRecordForm(true); }}
                                                                className="text-xs bg-primary/20 hover:bg-primary/40 text-primary px-2 py-1 rounded transition-colors"
                                                            >
                                                                {t('addPaymentBtn')}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setExpandedPayment(expandedPayment === p.id ? null : p.id)}
                                                            className="text-xs bg-white/10 hover:bg-white/20 text-white/70 px-2 py-1 rounded transition-colors"
                                                        >
                                                            {expandedPayment === p.id ? t('hideTransactions') : t('transactions')}
                                                        </button>
                                                    </div>
                                                    </td>
                                                </tr>
                                                {expandedPayment === p.id && (
                                                    <tr>
                                                        <td colSpan={feeItems.length > 0 ? 7 : 6} className="px-6 py-3 bg-black/20">
                                                            {(!transactions[p.id] || transactions[p.id].length === 0) ? (
                                                                <p className="text-white/40 text-xs text-center py-2">{t('noTransactions')}</p>
                                                            ) : (
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="text-white/40 border-b border-white/10">
                                                                            <th className="text-left py-1 px-2">{t('transactionDateCol')}</th>
                                                                            <th className="text-left py-1 px-2">{t('transactionMethodCol')}</th>
                                                                            <th className="text-right py-1 px-2">{t('transactionAmountCol')}</th>
                                                                            <th className="text-center py-1 px-2">{tc('actions')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {transactions[p.id].map(tx => (
                                                                            <tr key={tx.id} className="border-b border-white/5">
                                                                                <td className="py-1.5 px-2 text-white/70">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                                                <td className="py-1.5 px-2 text-white/70 capitalize">{tx.payment_method.replace('_', ' ')}</td>
                                                                                <td className="py-1.5 px-2 text-right text-green-400 font-semibold">{formatCurrency(tx.amount)}</td>
                                                                                <td className="py-1.5 px-2 text-center">
                                                                                    <button
                                                                                        onClick={() => handleDeleteTransaction(tx)}
                                                                                        disabled={saving}
                                                                                        className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                                                                                    >
                                                                                        {t('deleteTransactionBtn')}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </GlassCard>
                    )}

                    {/* EXPENSES TAB */}
                    {tab === 'expenses' && (
                        <GlassCard className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-semibold">{t('expensesTab')}</h3>
                                <button onClick={() => setShowExpForm(!showExpForm)}
                                    className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm transition-colors">
                                    + {t('addExpense')}
                                </button>
                            </div>

                            {showExpForm && (
                                <form onSubmit={handleAddExpense} className="bg-white/5 rounded-xl p-4 space-y-3">
                                    <h4 className="text-white text-sm font-semibold">{t('newExpense')}</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>{t('titleLabel')}</label>
                                            <input required value={expForm.title}
                                                onChange={e => setExpForm(p => ({ ...p, title: e.target.value }))}
                                                className={inputClass} placeholder={t('titlePlaceholder')} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('amountLabel')}</label>
                                            <input type="number" min="0.01" step="0.01" required value={expForm.amount}
                                                onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                                                className={inputClass} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('dateLabel')}</label>
                                            <input type="date" required value={expForm.date}
                                                onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                                                className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t('categoryLabel')}</label>
                                            <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}
                                                className={inputClass}>
                                                <option value="instructor">{t('catInstructor')}</option>
                                                <option value="materials">{t('catMaterials')}</option>
                                                <option value="venue">{t('catVenue')}</option>
                                                <option value="equipment">{t('catEquipment')}</option>
                                                <option value="marketing">{t('catMarketing')}</option>
                                                <option value="other">{t('catOther')}</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelClass}>{t('descriptionLabel')}</label>
                                            <input value={expForm.description}
                                                onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                                                className={inputClass} placeholder={t('optionalPlaceholder')} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setShowExpForm(false)}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">{tc('cancel')}</button>
                                        <button type="submit" disabled={saving}
                                            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm disabled:opacity-50">
                                            {saving ? tc('saving') : t('addExpense')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {expenses.length === 0 ? (
                                <div className="py-8 text-center text-white/50">{tc('noData')}</div>
                            ) : (
                                <div className="space-y-2">
                                    {expenses.map(exp => (
                                        <div key={exp.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded capitalize">{exp.category}</span>
                                                <div>
                                                    <p className="text-white text-sm font-medium">{exp.title}</p>
                                                    <p className="text-white/50 text-xs">{exp.expense_date}{exp.description ? ` · ${exp.description}` : ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-red-400 font-semibold text-sm">{formatCurrency(exp.amount)}</span>
                                                <button onClick={() => handleDeleteExpense(exp.id)}
                                                    className="text-white/30 hover:text-red-400 transition-colors text-xs">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2 border-t border-white/10">
                                        <span className="text-white/60 text-sm">{t('totalLabel')}: <span className="text-red-400 font-semibold">{formatCurrency(expenses.reduce((a, e) => a + Number(e.amount), 0))}</span></span>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    )}
                </>
            )}
        </div>
    );
}
