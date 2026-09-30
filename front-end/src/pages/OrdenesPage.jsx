import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';
import OrderList from '../components/orders/OrderList';
import OrderEditModal from '../components/orders/OrderEditModal';

const FILTERS = [
    { key: 'all', label: 'Todas', badgeClass: 'bg-primary-container/20 text-primary' },
    { key: 'pausada', label: 'Pausadas', badgeClass: 'bg-surface-container-high text-on-surface' },
    { key: 'enviada', label: 'Enviadas', badgeClass: 'bg-primary-container/20 text-primary' },
    { key: 'preparando', label: 'En Preparacion', badgeClass: 'bg-secondary-container/40 text-on-secondary-container' },
    { key: 'lista', label: 'Listas', badgeClass: 'bg-tertiary/15 text-tertiary' },
    { key: 'completada', label: 'Completadas', badgeClass: 'bg-tertiary/15 text-tertiary' },
];

export default function OrdenesPage() {
    const navigate = useNavigate();
    const { confirm, confirmModal } = useConfirm();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [editing, setEditing] = useState(null);
    const [detail, setDetail] = useState(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.getAdminOrders();
            setOrders(Array.isArray(data) ? data : []);
            setError('');
        } catch (e) {
            setError(e?.message || 'No se pudieron cargar las ordenes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(() => load(true), 15000);
        return () => clearInterval(interval);
    }, [load]);

    const counts = useMemo(() => {
        const result = { all: orders.length, pausada: 0, enviada: 0, preparando: 0, lista: 0, completada: 0 };
        orders.forEach(order => {
            if (result[order.status] !== undefined) result[order.status] += 1;
        });
        return result;
    }, [orders]);

    const visibleOrders = useMemo(
        () => (filter === 'all' ? orders : orders.filter(order => order.status === filter)),
        [orders, filter]
    );

    async function openModal(order, modal) {
        setBusyId(order.id);
        setError('');
        try {
            const full = await api.getAdminOrder(order.id);
            if (modal === 'edit') setEditing(full);
            else setDetail(full);
        } catch (e) {
            setError(e?.message || 'No se pudo cargar la orden');
        } finally {
            setBusyId(null);
        }
    }

    async function handleSend(order) {
        setBusyId(order.id);
        setError('');
        try {
            await api.sendToKitchen(order.id);
            await load(true);
        } catch (e) {
            setError(e?.message || 'No se pudo enviar la orden');
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
            await load(true);
        } catch (e) {
            setError(e?.message || 'No se pudo anular la orden');
        } finally {
            setBusyId(null);
        }
    }

    async function handleSave(payload) {
        await api.updateOrder(editing.id, payload);
        setEditing(null);
        await load(true);
    }

    return (
        <div className="flex flex-col min-h-screen bg-surface" data-testid="ordenes-page">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
                        <div className="min-w-0">
                            <h1 className="font-display text-lg text-primary font-semibold">Ordenes</h1>
                            <span className="text-[0.6875rem] text-on-surface-variant">
                                {orders.length} {orders.length === 1 ? 'orden activa' : 'ordenes activas'} · se actualiza cada 15 s
                            </span>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver
                    </button>
                </div>
            </header>

            <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-outline-variant/10">
                {FILTERS.map(chip => (
                    <button
                        key={chip.key}
                        type="button"
                        onClick={() => setFilter(chip.key)}
                        className={`chip ${filter === chip.key ? 'active' : ''}`}
                        data-testid={`ordenes-filter-${chip.key}`}
                    >
                        {chip.label}
                        <span className={`badge ${chip.badgeClass} ml-1`}>{counts[chip.key] || 0}</span>
                    </button>
                ))}
            </div>

            {error && (
                <div
                    role="alert"
                    className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-error/40 bg-error-container/40 px-4 py-2"
                    data-testid="ordenes-error"
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

            <main className="flex-1 p-4 pb-24 md:pb-4" data-testid="ordenes-main">
                {loading && orders.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">
                            progress_activity
                        </span>
                    </div>
                ) : visibleOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant" data-testid="ordenes-empty">
                        <span className="material-symbols-outlined text-[56px] mb-3 opacity-30">receipt_long</span>
                        <span className="font-semibold text-[0.9375rem]">No hay ordenes en este filtro</span>
                        <span className="text-[0.8125rem] opacity-60">Prueba con otro filtro o espera una nueva orden</span>
                    </div>
                ) : (
                    <OrderList
                        orders={visibleOrders}
                        busyId={busyId}
                        onEdit={order => openModal(order, 'edit')}
                        onDetail={order => openModal(order, 'detail')}
                        onSend={handleSend}
                        onVoid={handleVoid}
                    />
                )}
            </main>

            {editing && (
                <OrderEditModal
                    order={editing}
                    onClose={() => setEditing(null)}
                    onSave={handleSave}
                />
            )}

            {detail && (
                <OrderEditModal
                    order={detail}
                    onClose={() => setDetail(null)}
                    onSave={handleSave}
                />
            )}

            {confirmModal}
        </div>
    );
}
