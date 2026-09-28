import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';
import { formatClock, minutesSince } from '../utils/format';
import KdsCard from '../components/kds/KdsCard';
import KdsFilterChips from '../components/kds/KdsFilterChips';

const COLUMNS = [
    { key: 'enviada', label: 'Recibido', accent: 'text-primary', count: 'bg-primary-container/20 text-primary' },
    { key: 'preparando', label: 'En Preparacion', accent: 'text-secondary', count: 'bg-secondary-container/40 text-on-secondary-container' },
    { key: 'lista', label: 'Listo', accent: 'text-tertiary', count: 'bg-tertiary/15 text-tertiary' },
];

export default function KdsPage() {
    const navigate = useNavigate();
    const { confirm, confirmModal } = useConfirm();

    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState('grid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [tick, setTick] = useState(() => Date.now());
    const [clock, setClock] = useState(() => new Date());

    const load = useCallback(async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(Array.isArray(data) ? data : []);
            setError('');
        } catch (e) {
            setError(e?.message || 'No se pudo cargar la orden de cocina');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(() => load(), 15000);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        const interval = setInterval(() => setTick(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const counts = useMemo(() => {
        const result = { all: orders.length, enviada: 0, preparando: 0, lista: 0 };
        for (const order of orders) {
            if (result[order.status] !== undefined) result[order.status] += 1;
        }
        return result;
    }, [orders]);

    const pendingCount = counts.enviada + counts.preparando;
    const hasDelay = useMemo(
        () => orders.some(o => o.status !== 'lista' && minutesSince(o.sent_at, tick) > 15),
        [orders, tick]
    );

    const visibleOrders = useMemo(() => {
        const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
        const toTime = value => (value ? Date.parse(value) || 0 : 0);
        return [...filtered].sort((a, b) => toTime(a.sent_at) - toTime(b.sent_at));
    }, [orders, filter]);

    async function changeStatus(order, status) {
        setBusyId(order.id);
        setError('');
        try {
            await api.updateOrderStatus(order.id, status);
            await load();
        } catch (e) {
            setError(e?.message || 'No se pudo actualizar la orden');
        } finally {
            setBusyId(null);
        }
    }

    async function handleVoid(order) {
        const accepted = await confirm({
            title: 'Anular orden',
            message: `¿Anular la orden #${order.id}? Esta accion no se puede deshacer.`,
            confirmLabel: 'Anular',
            variant: 'danger',
        });
        if (!accepted) return;

        setBusyId(order.id);
        setError('');
        try {
            await api.voidOrder(order.id);
            await load();
        } catch (e) {
            setError(e?.message || 'No se pudo anular la orden');
        } finally {
            setBusyId(null);
        }
    }

    function renderCards(list) {
        return list.map(order => (
            <KdsCard
                key={order.id}
                order={order}
                now={tick}
                busy={busyId === order.id}
                onStatus={changeStatus}
                onVoid={handleVoid}
            />
        ));
    }

    function toggleView() {
        if (view === 'grid') {
            setView('columns');
            setFilter('all');
        } else {
            setView('grid');
        }
    }

    const emptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
            <span className="material-symbols-outlined text-[56px] mb-3 opacity-30">coffee_maker</span>
            <span className="font-semibold text-[0.9375rem]">Sin ordenes</span>
            <span className="text-[0.8125rem] opacity-60">No hay ordenes en esta categoria</span>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[22px]">coffee_maker</span>
                        <div className="min-w-0">
                            <h1 className="font-display text-lg text-primary font-semibold">KDS Cocina</h1>
                            <div className="flex items-center gap-3 text-[0.6875rem] flex-wrap">
                                <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary pulse-dot"></span>
                                    {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
                                </span>
                                {hasDelay && (
                                    <span className="inline-flex items-center gap-1 text-error font-semibold">
                                        <span className="material-symbols-outlined text-[12px]">warning</span> Retraso
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-on-surface-variant tabular-nums">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    {formatClock(clock)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={toggleView}
                            className="btn-ghost py-1.5"
                            data-testid="kds-view-toggle"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {view === 'grid' ? 'view_week' : 'grid_view'}
                            </span>
                            {view === 'grid' ? 'Columnas' : 'Cuadricula'}
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver
                        </button>
                    </div>
                </div>
            </header>

            {view === 'grid' && (
                <KdsFilterChips counts={counts} active={filter} onChange={setFilter} />
            )}

            {error && (
                <div
                    role="alert"
                    className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-error/40 bg-error-container/40 px-4 py-2"
                    data-testid="kds-error"
                >
                    <div className="flex items-center gap-2 text-[0.8125rem] text-on-error-container">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>{error}</span>
                    </div>
                    <button type="button" className="btn-ghost py-1" onClick={() => setError('')}>
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            )}

            <main className="flex-1 p-4 pb-24 md:pb-4" data-testid="kds-orders">
                {loading && orders.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">
                            progress_activity
                        </span>
                    </div>
                ) : view === 'grid' ? (
                    visibleOrders.length === 0 ? (
                        emptyState
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {renderCards(visibleOrders)}
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        {COLUMNS.map(column => {
                            const columnOrders = visibleOrders.filter(o => o.status === column.key);
                            return (
                                <section
                                    key={column.key}
                                    className="bg-surface-container-low/60 rounded-2xl border border-outline-variant/15 p-3"
                                    data-testid={`kds-column-${column.key}`}
                                >
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h2 className={`font-display text-sm font-semibold ${column.accent}`}>
                                            {column.label}
                                        </h2>
                                        <span className={`badge ${column.count}`}>{columnOrders.length}</span>
                                    </div>
                                    {columnOrders.length === 0 ? (
                                        <p className="text-center text-[0.75rem] text-on-surface-variant py-6 opacity-60">
                                            Sin ordenes
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-3">{renderCards(columnOrders)}</div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>

            {confirmModal}
        </div>
    );
}
