import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/format';
import KpiCard from '../components/reports/KpiCard';
import HourlyChart from '../components/reports/HourlyChart';
import CategoryChart from '../components/reports/CategoryChart';
import ProductRankingTable from '../components/reports/ProductRankingTable';
import PeriodComparison from '../components/reports/PeriodComparison';
import SalesTrendChart from '../components/reports/SalesTrendChart';

const RANGES = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'ayer', label: 'Ayer' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes', label: 'Este mes' },
];

function isoDate(d) {
    return d.toISOString().slice(0, 10);
}

function getRange(key) {
    const today = new Date();
    const todayStr = isoDate(today);

    if (key === 'ayer') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const ys = isoDate(y);
        return { date: ys, start: ys, end: ys };
    }
    if (key === 'semana') {
        const monday = new Date(today);
        const offset = (today.getDay() + 6) % 7;
        monday.setDate(today.getDate() - offset);
        return { date: todayStr, start: isoDate(monday), end: todayStr };
    }
    if (key === 'mes') {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        return { date: todayStr, start: isoDate(first), end: todayStr };
    }
    return { date: todayStr, start: todayStr, end: todayStr };
}

function formatShiftDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-GT', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

export default function ReportesPage() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [range, setRange] = useState('hoy');
    const [report, setReport] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [trend, setTrend] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (rangeKey) => {
        setLoading(true);
        const { date, start, end } = getRange(rangeKey);
        try {
            const [daily, period, trendData, shiftHistory] = await Promise.all([
                api.getDailyReport(date, start, end),
                api.getPeriodComparison(date),
                api.getSalesTrend({ start, end }),
                api.getShiftHistory(5),
            ]);
            setReport(daily);
            setComparison(period);
            setTrend(Array.isArray(trendData) ? trendData : []);
            setShifts(Array.isArray(shiftHistory) ? shiftHistory : []);
        } catch {
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(range); }, [range, load]);

    if (!isAdmin) {
        return (
            <div className="flex flex-col min-h-screen bg-surface items-center justify-center gap-3 px-6 text-center">
                <span className="material-symbols-outlined text-[56px] text-outline">lock</span>
                <h1 className="font-display text-xl text-on-surface font-semibold">Acceso restringido</h1>
                <p className="text-sm text-on-surface-variant max-w-xs">
                    Solo los administradores pueden acceder a los reportes y finanzas.
                </p>
                <button onClick={() => navigate('/dashboard')} className="btn-primary text-[0.8125rem] py-2">
                    Volver al inicio
                </button>
            </div>
        );
    }

    const summary = report?.summary || {};

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-display text-lg text-primary font-semibold">Reportes & Finanzas</h1>
                            <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-tertiary/10 text-tertiary flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span> En Vivo
                            </span>
                        </div>
                        <span className="text-sm text-on-surface-variant">Inteligencia Operativa</span>
                    </div>
                    <button className="btn-secondary text-[0.75rem] py-1.5 hidden md:flex">
                        <span className="material-symbols-outlined text-[16px]">download</span> Exportar
                    </button>
                </div>

                <div className="px-4 md:px-6 pb-3 flex gap-1.5 overflow-x-auto">
                    {RANGES.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setRange(r.key)}
                            className={`tab-pill text-[0.75rem] ${range === r.key ? 'active' : ''}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20 text-on-surface-variant">
                        Cargando reportes...
                    </div>
                ) : !report ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[48px] text-outline">error</span>
                        <span className="text-sm">No se pudieron cargar los reportes</span>
                    </div>
                ) : (
                    <>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-[#6F4E37] to-primary p-5 text-on-primary shadow-lg">
                            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                                <span className="material-symbols-outlined text-[120px]">analytics</span>
                            </div>
                            <div className="relative z-10 mb-3">
                                <span className="text-xs tracking-wider uppercase opacity-80">Ventas del Periodo</span>
                                <div className="font-display text-3xl font-bold leading-none mt-1">
                                    {formatCurrency(summary.total_sales)}
                                </div>
                            </div>
                            <div className="relative z-10 grid grid-cols-4 gap-3 mt-4">
                                <div>
                                    <span className="text-[0.625rem] opacity-80 block">Efectivo</span>
                                    <span className="text-sm font-bold">{formatCurrency(summary.cash_sales)}</span>
                                </div>
                                <div>
                                    <span className="text-[0.625rem] opacity-80 block">Tarjeta</span>
                                    <span className="text-sm font-bold">{formatCurrency(summary.card_sales)}</span>
                                </div>
                                <div>
                                    <span className="text-[0.625rem] opacity-80 block">QR</span>
                                    <span className="text-sm font-bold">{formatCurrency(summary.qr_sales)}</span>
                                </div>
                                <div>
                                    <span className="text-[0.625rem] opacity-80 block">Trans.</span>
                                    <span className="text-sm font-bold">{summary.transaction_count}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard icon="receipt_long" label="Transacciones" value={summary.transaction_count} accent="primary" />
                            <KpiCard icon="payments" label="Ticket Promedio" value={formatCurrency(summary.avg_ticket)} accent="secondary" />
                            <KpiCard icon="savings" label="Efectivo" value={formatCurrency(summary.cash_sales)} accent="tertiary" />
                            <KpiCard icon="credit_card" label="Tarjeta + QR" value={formatCurrency((summary.card_sales || 0) + (summary.qr_sales || 0))} accent="primary" />
                        </div>

                        <PeriodComparison data={comparison} />

                        <SalesTrendChart data={trend} title="Tendencia de Ventas" height={200} />

                        <HourlyChart data={report.hourly} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <CategoryChart data={report.categories} />
                            <ProductRankingTable data={report.ranking} limit={10} />
                        </div>

                        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display text-lg text-on-surface font-semibold">Cierre de Caja</h3>
                                <button onClick={() => navigate('/caja')} className="text-secondary text-[0.75rem] font-semibold hover:underline">
                                    Ver caja
                                </button>
                            </div>

                            {shifts.length === 0 ? (
                                <div className="py-6 text-center text-on-surface-variant text-sm">
                                    No hay turnos cerrados registrados
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {shifts.map((shift) => {
                                        const diff = Number(shift.difference) || 0;
                                        return (
                                            <div key={shift.id} className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center flex-shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-[0.8125rem] text-on-surface block truncate">
                                                            {shift.cashier_name || 'Cajero'}
                                                        </span>
                                                        <span className="text-[0.6875rem] text-on-surface-variant">
                                                            {formatShiftDate(shift.close_time)} &bull; {shift.station}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className="font-display text-sm font-bold text-on-surface block">
                                                            {formatCurrency(shift.total_sales)}
                                                        </span>
                                                        <span className="text-[0.6875rem] text-on-surface-variant">
                                                            {shift.transaction_count} trans.
                                                        </span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${diff === 0 ? 'bg-tertiary-container/15 text-tertiary' : diff > 0 ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-error/10 text-error'}`}>
                                                        {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
