import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/apiClient';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import CashPaymentForm from '../components/CashPaymentForm';
import ReceiptModal from '../components/ReceiptModal';
import ShiftStatusBadge from '../components/ShiftStatusBadge';
import ArqueoModal from '../components/ArqueoModal';
import TransactionsList from '../components/TransactionsList';
import TransactionDetailModal from '../components/TransactionDetailModal';
import ShiftTransactionsModal from '../components/ShiftTransactionsModal';

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('es-GT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `hace ${diff}m`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
}

export default function CajaPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order');

    return orderId
        ? <PaymentView orderId={orderId} navigate={navigate} />
        : <ShiftView navigate={navigate} />;
}

function ShiftView({ navigate }) {
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startCash, setStartCash] = useState('200');
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState(null);
    const [showArqueo, setShowArqueo] = useState(false);
    const [arqueoData, setArqueoData] = useState(null);
    const [closing, setClosing] = useState(false);
    const [history, setHistory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);
    const [selectedHistoryShift, setSelectedHistoryShift] = useState(null);

    const loadShift = useCallback(async () => {
        try {
            const data = await api.getCurrentShift();
            setShift(data);
        } catch {
            setShift(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTransactions = useCallback(async (shiftId) => {
        try {
            const data = await api.getShiftTransactions(shiftId);
            setTransactions(Array.isArray(data) ? data : []);
        } catch {
            setTransactions([]);
        } finally {
            setLoadingTx(false);
        }
    }, []);

    useEffect(() => { loadShift(); }, [loadShift]);

    useEffect(() => {
        if (shift) {
            api.getShiftHistory(5).then(setHistory).catch(() => {});
        }
    }, [shift]);

    useEffect(() => {
        const shiftId = shift?.id;
        if (!shiftId) return;
        loadTransactions(shiftId);
        const interval = setInterval(() => {
            loadTransactions(shiftId);
            loadShift();
        }, 15000);
        return () => clearInterval(interval);
    }, [shift?.id, loadTransactions, loadShift]);

    const handleOpen = async () => {
        setOpening(true);
        setError(null);
        try {
            const result = await api.openShift({ start_cash: Number(startCash) || 0 });
            if (result.error) throw new Error(result.error);
            await loadShift();
        } catch (err) {
            setError(err.message);
        } finally {
            setOpening(false);
        }
    };

    const handleOpenArqueo = async () => {
        if (!shift) return;
        setError(null);
        try {
            const data = await api.getArqueo(shift.id);
            setArqueoData(data);
            setShowArqueo(true);
        } catch {
            setArqueoData({ cash_total: 0, card_total: 0, qr_total: 0, transaction_count: 0 });
            setShowArqueo(true);
        }
    };

    const handleConfirmClose = async (totalContado) => {
        setClosing(true);
        setError(null);
        try {
            const result = await api.closeShift(shift.id, { actual_cash: totalContado });
            if (result.error) throw new Error(result.error);
            setShowArqueo(false);
            setShift(null);
            setArqueoData(null);
            await api.getShiftHistory(5).then(setHistory).catch(() => {});
        } catch (err) {
            setError(err.message);
        } finally {
            setClosing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-surface items-center justify-center">
                <span className="material-symbols-outlined text-[40px] text-on-surface-variant animate-pending">hourglass_empty</span>
            </div>
        );
    }

    // ========================
    // TURNO ABIERTO
    // ========================
    if (shift) {
        return (
            <div className="flex flex-col min-h-screen bg-surface">
                <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                    <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                        <div>
                            <h1 className="font-display text-lg text-primary font-semibold">Caja</h1>
                            <span className="text-sm text-on-surface-variant">
                                Turno #{shift.id} &middot; {shift.station}
                            </span>
                        </div>
                        <ShiftStatusBadge shift={shift} onClick={handleOpenArqueo} />
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                    {error && (
                        <div className="bg-error-container/10 border border-error/30 rounded-xl p-3 text-center">
                            <p className="text-error text-sm font-semibold">{error}</p>
                        </div>
                    )}

                    {/* Info del turno */}
                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">{shift.cashier_name}</p>
                                    <p className="text-xs text-on-surface-variant">
                                        Inicio: {formatTime(shift.start_time)} &middot; Efectivo: {formatCurrency(shift.start_cash)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs text-on-surface-variant">
                                {timeAgo(shift.start_time)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                            {shift.transaction_count || 0} transacciones
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="kpi-card">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-tertiary text-[18px]">payments</span>
                                </span>
                                <span className="text-xs text-on-surface-variant font-semibold">Efectivo</span>
                            </div>
                            <span className="font-display text-lg text-on-surface font-bold">{formatCurrency(shift.cash_sales)}</span>
                        </div>
                        <div className="kpi-card">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[18px]">credit_card</span>
                                </span>
                                <span className="text-xs text-on-surface-variant font-semibold">Tarjeta</span>
                            </div>
                            <span className="font-display text-lg text-on-surface font-bold">{formatCurrency(shift.card_sales)}</span>
                        </div>
                        <div className="kpi-card">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-secondary text-[18px]">qr_code</span>
                                </span>
                                <span className="text-xs text-on-surface-variant font-semibold">QR</span>
                            </div>
                            <span className="font-display text-lg text-on-surface font-bold">{formatCurrency(shift.qr_sales)}</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-primary/5 rounded-2xl border border-primary/15 p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-on-surface-variant">Total del turno</span>
                            <span className="font-display text-xl text-primary font-bold">
                                {formatCurrency(Number(shift.cash_sales || 0) + Number(shift.card_sales || 0) + Number(shift.qr_sales || 0))}
                            </span>
                        </div>
                    </div>

                    {/* Cerrar turno */}
                    <button
                        onClick={handleOpenArqueo}
                        className="btn-secondary w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-[16px]">lock</span> Cerrar Turno
                    </button>

                    {/* Movimientos del turno */}
                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">receipt_long</span>
                                Movimientos del turno
                            </h3>
                            <span className="text-xs text-on-surface-variant">{transactions.length}</span>
                        </div>
                        <TransactionsList
                            transactions={transactions}
                            loading={loadingTx}
                            onSelect={setSelectedTx}
                        />
                    </div>

                    {/* Historial */}
                    {history.length > 0 && (
                        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                            <h3 className="text-sm font-semibold text-on-surface mb-3">Turnos Anteriores</h3>
                            <div className="flex flex-col gap-2">
                                {history.map(h => (
                                    <button
                                        key={h.id}
                                        onClick={() => setSelectedHistoryShift(h)}
                                        className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0 w-full text-left hover:opacity-80 transition-opacity"
                                    >
                                        <div>
                                            <p className="text-sm text-on-surface">Turno #{h.id} &middot; {h.cashier_name}</p>
                                            <p className="text-xs text-on-surface-variant">
                                                {formatDateTime(h.close_time)} &middot; {h.transaction_count} tx
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-on-surface">{formatCurrency(h.total_sales)}</p>
                                                <p className={`text-xs font-semibold ${Number(h.difference) >= 0 ? 'text-tertiary' : 'text-error'}`}>
                                                    {Number(h.difference) >= 0 ? '+' : ''}{formatCurrency(h.difference)}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full justify-center">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al Dashboard
                    </button>
                </main>

                {showArqueo && (
                    <ArqueoModal
                        shift={shift}
                        arqueo={arqueoData}
                        onConfirm={handleConfirmClose}
                        onClose={() => { setShowArqueo(false); setArqueoData(null); }}
                        loading={closing}
                        error={error}
                    />
                )}

                {selectedTx && (
                    <TransactionDetailModal
                        transaction={selectedTx}
                        onClose={() => setSelectedTx(null)}
                    />
                )}

                {selectedHistoryShift && (
                    <ShiftTransactionsModal
                        shift={selectedHistoryShift}
                        onClose={() => setSelectedHistoryShift(null)}
                    />
                )}
            </div>
        );
    }

    // ========================
    // SIN TURNO — Apertura
    // ========================
    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-lg text-primary font-semibold">Caja</h1>
                        <span className="text-sm text-on-surface-variant">Sin turno activo</span>
                    </div>
                    <ShiftStatusBadge shift={null} />
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                {error && (
                    <div className="bg-error-container/10 border border-error/30 rounded-xl p-3 text-center">
                        <p className="text-error text-sm font-semibold">{error}</p>
                    </div>
                )}

                {/* KPIs en cero */}
                <div className="grid grid-cols-3 gap-3 opacity-60">
                    <div className="kpi-card">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-tertiary text-[18px]">payments</span>
                            </span>
                            <span className="text-xs text-on-surface-variant font-semibold">Efectivo</span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
                    </div>
                    <div className="kpi-card">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[18px]">credit_card</span>
                            </span>
                            <span className="text-xs text-on-surface-variant font-semibold">Tarjeta</span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
                    </div>
                    <div className="kpi-card">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-secondary text-[18px]">qr_code</span>
                            </span>
                            <span className="text-xs text-on-surface-variant font-semibold">QR</span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
                    </div>
                </div>

                {/* Abrir turno */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                    <h3 className="font-display text-lg text-on-surface font-semibold mb-4">Abrir Turno</h3>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">
                                Efectivo Inicial
                            </label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="Q 0.00"
                                value={startCash}
                                onChange={e => setStartCash(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <button
                            onClick={handleOpen}
                            disabled={opening || !startCash}
                            className="btn-primary self-start"
                        >
                            <span className="material-symbols-outlined text-[16px]">lock_open</span>
                            {opening ? 'Abriendo...' : 'Abrir Caja'}
                        </button>
                    </div>
                </div>

                {/* Historial reciente */}
                {history.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                        <h3 className="text-sm font-semibold text-on-surface mb-3">Turnos Anteriores</h3>
                        <div className="flex flex-col gap-2">
                            {history.map(h => (
                                <button
                                    key={h.id}
                                    onClick={() => setSelectedHistoryShift(h)}
                                    className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0 w-full text-left hover:opacity-80 transition-opacity"
                                >
                                    <div>
                                        <p className="text-sm text-on-surface">Turno #{h.id} &middot; {h.cashier_name}</p>
                                        <p className="text-xs text-on-surface-variant">
                                            {formatDateTime(h.close_time)} &middot; {h.transaction_count} tx
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-on-surface">{formatCurrency(h.total_sales)}</p>
                                            <p className={`text-xs font-semibold ${Number(h.difference) >= 0 ? 'text-tertiary' : 'text-error'}`}>
                                                {Number(h.difference) >= 0 ? '+' : ''}{formatCurrency(h.difference)}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full justify-center">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al Dashboard
                </button>
            </main>

            {selectedHistoryShift && (
                <ShiftTransactionsModal
                    shift={selectedHistoryShift}
                    onClose={() => setSelectedHistoryShift(null)}
                />
            )}
        </div>
    );
}

function PaymentView({ orderId, navigate }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [method, setMethod] = useState('efectivo');
    const [amountGiven, setAmountGiven] = useState(0);
    const [applyTax, setApplyTax] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [shift, setShift] = useState(null);

    useEffect(() => {
        Promise.all([
            api.getOrder(orderId),
            api.getCurrentShift()
        ]).then(([orderData, shiftData]) => {
            if (orderData.error) throw new Error(orderData.error);
            setOrder(orderData);
            setAmountGiven(Number(orderData.total) || 0);
            setShift(shiftData);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [orderId]);

    const amountDue = applyTax
        ? Number(order?.total || 0)
        : Number(order?.subtotal || 0);
    const change = Math.max(0, amountGiven - amountDue);
    const canPay = order && order.status === 'pausada' && shift && !processing &&
        (method !== 'efectivo' || amountGiven >= amountDue);

    const handlePay = useCallback(async () => {
        if (!canPay) return;
        setProcessing(true);
        try {
            const result = await api.recordPayment({
                order_id: Number(orderId),
                method,
                amount_given: method === 'efectivo' ? amountGiven : null,
                sat_invoice: null,
                apply_tax: applyTax
            });
            if (result.error) throw new Error(result.error);

            const paymentData = await api.getPaymentById(result.payment_id);
            if (!paymentData || paymentData.error || !paymentData.id) {
                throw new Error(paymentData?.error || 'No se pudo recuperar el pago registrado');
            }
            setReceipt({
                payment: paymentData,
                order: {
                    ...order,
                    subtotal: paymentData.subtotal,
                    tax: paymentData.tax,
                    total: paymentData.total
                }
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    }, [canPay, orderId, method, amountGiven, order, applyTax]);

    const handleReceiptClose = () => {
        setReceipt(null);
        navigate('/pos');
    };

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center gap-3">
                    <button onClick={() => navigate('/pos')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-lg text-primary font-semibold">Cobrar</h1>
                        <span className="text-sm text-on-surface-variant truncate">
                            Orden #{orderId}{order?.customer_name ? ` \u00b7 ${order.customer_name}` : ''}
                        </span>
                    </div>
                    <ShiftStatusBadge shift={shift} />
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
                {loading && (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-[40px] text-on-surface-variant animate-pending">hourglass_empty</span>
                        <p className="text-on-surface-variant mt-2">Cargando orden...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-error-container/10 border border-error/30 rounded-xl p-4 text-center">
                        <span className="material-symbols-outlined text-error text-[28px]">error</span>
                        <p className="text-error font-semibold mt-1 text-sm">{error}</p>
                        <button onClick={() => navigate('/pos')} className="btn-secondary mt-3 text-sm">
                            Volver al POS
                        </button>
                    </div>
                )}

                {order && !loading && !error && (
                    <>
                        {order.status !== 'pausada' && (
                            <div className="bg-tertiary-container/20 border border-tertiary/30 rounded-xl p-4 text-center">
                                <span className="material-symbols-outlined text-tertiary text-[28px]">check_circle</span>
                                <p className="text-tertiary font-semibold mt-1">Esta orden ya fue cobrada</p>
                                <button onClick={() => navigate('/pos')} className="btn-secondary mt-3 text-sm">
                                    Volver al POS
                                </button>
                            </div>
                        )}

                        {order.status === 'pausada' && (
                            <>
                                {!shift && (
                                    <div className="bg-tertiary-container/20 border border-tertiary/40 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-tertiary text-[24px]">point_of_sale</span>
                                            <div className="flex-1">
                                                <p className="text-on-surface font-semibold text-sm">No hay un turno de caja abierto</p>
                                                <p className="text-on-surface-variant text-xs mt-1">
                                                    Debes abrir caja antes de registrar un cobro.
                                                </p>
                                                <button
                                                    onClick={() => navigate('/caja')}
                                                    className="btn-primary mt-3 text-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">lock_open</span> Abrir Caja
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 ${!shift ? 'opacity-60' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-display text-lg text-on-surface font-bold">
                                            Q {amountDue.toFixed(2)}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-tertiary-container/30 text-tertiary">
                                            {order.table_name || 'Para llevar'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-on-surface-variant space-y-1">
                                        {order.items?.map((item, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>
                                                    {item.quantity}x {item.product_name}
                                                    {item.modifier_labels && (
                                                        <span className="text-xs ml-1">({item.modifier_labels})</span>
                                                    )}
                                                </span>
                                                <span className="font-semibold text-on-surface">
                                                    Q{(item.quantity * item.unit_price).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <hr className="border-outline-variant/20 my-3" />
                                    <div className="flex justify-between text-sm">
                                        <span className="text-on-surface-variant">Subtotal</span>
                                        <span>Q{Number(order.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-on-surface-variant">IVA 12%</span>
                                        <span className={applyTax ? '' : 'line-through text-on-surface-variant'}>
                                            Q{Number(order.tax || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    <label className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/20 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={applyTax}
                                            onChange={e => setApplyTax(e.target.checked)}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-sm font-semibold text-on-surface">Aplicar IVA 12%</span>
                                    </label>
                                </div>

                                {shift && (
                                    <>
                                        <PaymentMethodSelector selected={method} onSelect={setMethod} />

                                        {method === 'efectivo' && (
                                            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                                                <CashPaymentForm
                                                    total={amountDue}
                                                    onAmountGivenChange={setAmountGiven}
                                                />
                                            </div>
                                        )}

                                        {method !== 'efectivo' && (
                                            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                                                <p className="text-on-surface-variant text-sm text-center">
                                                    El pago con <strong>{method === 'tarjeta' ? 'tarjeta' : 'QR'}</strong> se registra aqui.
                                                    <br />El cobro real se realiza en la terminal fisica.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={handlePay}
                                    disabled={!canPay}
                                    className={`btn-primary w-full justify-center text-base py-4 ${
                                        !canPay ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{shift ? 'savings' : 'lock'}</span>
                                    {shift ? `Cobrar Q ${amountDue.toFixed(2)}` : 'Abre caja para cobrar'}
                                </button>
                            </>
                        )}
                    </>
                )}
            </main>

            <ReceiptModal
                payment={receipt?.payment}
                order={receipt?.order}
                onClose={handleReceiptClose}
            />
        </div>
    );
}
