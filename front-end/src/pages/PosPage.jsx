import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import { api } from '../api/apiClient';
import OrderModeToggle from '../components/OrderModeToggle';
import TableSelector from '../components/TableSelector';
import CustomerNameInput from '../components/CustomerNameInput';
import ProductosPos from '../components/ProductosPos';
import Ticket from '../components/Ticket';
import ParkedOrdersPanel from '../components/ParkedOrdersPanel';

export default function PosPage() {
    const navigate = useNavigate();
    const { order, addItem, updateQuantity, removeItem, setTable, setCustomerName, setMode, setNotes, loadOrder, reset, computeTotals, hasItems, saveOrder } = useOrder();

    const [tables, setTables] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showToast, setShowToast] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [refreshParked, setRefreshParked] = useState(0);
    const tableSelectorRef = useRef(null);

    useEffect(() => {
        async function loadTables() {
            try {
                const data = await api.getTables();
                setTables(data);
            } catch {
                setTables([]);
            }
        }
        loadTables();
    }, []);

    function showTemp(message, type = 'success') {
        setShowToast({ message, type });
        setTimeout(() => setShowToast(null), 3000);
    }

    function handleAddProduct(product, modifiers, modifierLabels, finalPrice) {
        addItem(product, modifiers, modifierLabels, finalPrice);
    }

    async function handlePark() {
        if (!hasItems) {
            showTemp('Agrega productos al ticket primero', 'error');
            return;
        }
        if (!order.customerName.trim() && !order.tableId) {
            showTemp('Ingresa nombre de cliente o selecciona mesa', 'error');
            return;
        }

        setActionBusy(true);
        try {
            const res = await saveOrder();
            if (res.error) throw new Error(res.error);
            const label = order.customerName || `Orden #${res.order_id}`;
            showTemp(`Orden ${label} pausada`, 'success');
            reset();
            setRefreshParked(r => r + 1);
        } catch (err) {
            showTemp(err.message || 'Error al pausar', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    async function handleRetomar(parkedOrder) {
        setActionBusy(true);
        try {
            const full = await api.getOrder(parkedOrder.id);
            loadOrder(full);
            showTemp(`Orden #${parkedOrder.id} cargada`, 'success');
        } catch {
            showTemp('Error al cargar orden', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    async function handleAnular(parkedOrder) {
        if (!confirm(`Anular orden #${parkedOrder.id}?`)) return;
        setActionBusy(true);
        try {
            const res = await api.voidOrder(parkedOrder.id);
            if (res.error) throw new Error(res.error);
            showTemp(`Orden #${parkedOrder.id} anulada`, 'success');
            setRefreshParked(r => r + 1);
        } catch {
            showTemp('Error al anular', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    function handleCobrar(parkedOrder) {
        navigate(`/caja?order=${parkedOrder.id}`);
    }

    const totals = computeTotals();
    const orderLabel = order.customerName || (order.orderId ? `Orden #${order.orderId}` : 'Nueva Orden');

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            {/* Header */}
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-semibold">Volver</span>
                                <span className="text-[0.625rem] text-on-surface-variant">Dashboard</span>
                            </div>
                        </button>
                        <div className="h-8 w-px bg-outline-variant hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-widest text-secondary font-bold">Orden</span>
                            <span className="font-display text-lg text-primary truncate max-w-[180px] sm:max-w-xs">
                                {orderLabel}
                            </span>
                            <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-lg text-[0.6875rem] font-semibold">
                                {new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <OrderModeToggle mode={order.mode} onChange={setMode} />
                </div>
            </header>

            {/* Control bar */}
            <div className="px-4 md:px-6 py-3 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center gap-3 flex-wrap">
                <div ref={tableSelectorRef}>
                    <TableSelector
                        tables={tables}
                        selectedId={order.tableId}
                        onSelect={(t) => setTable(t.id, t.name)}
                        onClose={() => {}}
                    />
                </div>
                <div className="w-64">
                    <CustomerNameInput value={order.customerName} onChange={setCustomerName} />
                </div>
                <input
                    type="text"
                    value={order.notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input-field w-48"
                    placeholder="Notas..."
                    data-testid="order-notes"
                />
            </div>

            {/* Main content */}
            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col lg:flex-row gap-4">
                <div className="lg:w-2/3">
                    <ProductosPos
                        onAddProduct={handleAddProduct}
                        selectedCategory={selectedCategory}
                        onCategorySelect={setSelectedCategory}
                    />
                </div>

                <div className="lg:w-1/3 flex flex-col gap-4">
                    <Ticket
                        items={order.items}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                        totals={totals}
                    />

                    <button
                        onClick={handlePark}
                        disabled={!hasItems || actionBusy}
                        className="btn-primary w-full text-[0.75rem] py-2 disabled:opacity-50"
                        data-testid="park-order"
                    >
                        <span className="material-symbols-outlined text-[16px]">{actionBusy ? 'hourglass_empty' : 'pause_circle'}</span>
                        Pausar Orden
                    </button>

                    <ParkedOrdersPanel
                        onRetomar={handleRetomar}
                        onCobrar={handleCobrar}
                        onAnular={handleAnular}
                        refreshTrigger={refreshParked}
                    />
                </div>
            </main>

            {showToast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-50 ${showToast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">{showToast.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span>{showToast.message}</span>
                </div>
            )}
        </div>
    );
}
