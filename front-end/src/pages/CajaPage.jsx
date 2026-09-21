import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/apiClient';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import CashPaymentForm from '../components/CashPaymentForm';
import ReceiptModal from '../components/ReceiptModal';

export default function CajaPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState(null);
    const [method, setMethod] = useState('efectivo');
    const [amountGiven, setAmountGiven] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [receipt, setReceipt] = useState(null);

    useEffect(() => {
        if (!orderId) return;
        setLoading(true);
        api.getOrder(orderId)
            .then(data => {
                if (data.error) throw new Error(data.error);
                setOrder(data);
                setAmountGiven(Number(data.total) || 0);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [orderId]);

    const change = Math.max(0, amountGiven - (Number(order?.total) || 0));
    const canPay = order && order.status === 'pausada' && !processing &&
        (method !== 'efectivo' || amountGiven >= Number(order?.total));

    const handlePay = useCallback(async () => {
        if (!canPay) return;
        setProcessing(true);
        try {
            const result = await api.recordPayment({
                order_id: Number(orderId),
                method,
                amount_given: method === 'efectivo' ? amountGiven : null,
                sat_invoice: null
            });
            if (result.error) throw new Error(result.error);

            const paymentData = await api.getPaymentById(result.payment_id);
            setReceipt({ payment: paymentData, order });
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    }, [canPay, orderId, method, amountGiven, order]);

    const handleReceiptClose = () => {
        setReceipt(null);
        navigate('/pos');
    };

    // ========================
    // SIN ORDEN — placeholder caja/turnos
    // ========================
    if (!orderId) {
        return (
            <div className="flex flex-col min-h-screen bg-surface">
                <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                    <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                        <div>
                            <h1 className="font-display text-lg text-primary font-semibold">Caja</h1>
                            <span className="text-sm text-on-surface-variant">Turno</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold flex items-center gap-1 bg-surface-container text-on-surface-variant">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            Turno Cerrado
                        </span>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
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

                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                        <h3 className="font-display text-lg text-on-surface font-semibold mb-4">Abrir Turno</h3>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Efectivo Inicial</label>
                                <input type="number" className="input-field" placeholder="Q 0.00" defaultValue="500" disabled />
                            </div>
                            <button className="btn-primary self-start" disabled>
                                <span className="material-symbols-outlined text-[16px]">lock_open</span> Abrir Caja
                            </button>
                            <p className="text-xs text-on-surface-variant italic">Proximamente (FASE 10)</p>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                        <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Ultimos Movimientos</h3>
                        <p className="text-on-surface-variant text-sm py-4 text-center">No hay movimientos hoy</p>
                    </div>

                    <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full justify-center">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al Dashboard
                    </button>
                </main>
            </div>
        );
    }

    // ========================
    // CON ORDEN — pantalla de cobro
    // ========================
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
                                {/* Resumen de la orden */}
                                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-display text-lg text-on-surface font-bold">
                                            Q {Number(order.total).toFixed(2)}
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
                                        <span>Q{order.subtotal?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-on-surface-variant">IVA 12%</span>
                                        <span>Q{order.tax?.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Metodo de pago */}
                                <PaymentMethodSelector selected={method} onSelect={setMethod} />

                                {/* Formulario efectivo */}
                                {method === 'efectivo' && (
                                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                                        <CashPaymentForm
                                            total={Number(order.total)}
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

                                {/* Boton cobrar */}
                                <button
                                    onClick={handlePay}
                                    disabled={!canPay}
                                    className={`btn-primary w-full justify-center text-base py-4 ${
                                        !canPay ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">savings</span>
                                    Cobrar Q {Number(order.total).toFixed(2)}
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
