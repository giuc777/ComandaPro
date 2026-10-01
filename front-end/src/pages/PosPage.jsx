import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import { useConfirm } from '../hooks/useConfirm';
import { api } from '../api/apiClient';
import OrderModeToggle from '../components/OrderModeToggle';
import TableSelector from '../components/TableSelector';
import CustomerNameInput from '../components/CustomerNameInput';
import ProductosPos from '../components/ProductosPos';
import Ticket from '../components/Ticket';
import ParkedOrdersPanel from '../components/ParkedOrdersPanel';

export default function PosPage() {
    const navigate = useNavigate();
    const { order, addItem, updateQuantity, removeItem, setTable, setCustomerName, setMode, setNotes, loadOrder, reset, computeTotals, hasItems, saveOrder, sendToKitchen } = useOrder();
    const { confirm, confirmModal } = useConfirm();

    const [tables, setTables] = useState([]);
    const [tablesRefresh, setTablesRefresh] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showToast, setShowToast] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [refreshParked, setRefreshParked] = useState(0);
    const tableSelectorRef = useRef(null);

    const canReplace = !order.orderId || !order.status || order.status === 'pausada';
    const isAppendMode = Boolean(order.orderId) && Boolean(order.status) && order.status !== 'pausada';
    const canAdd = !order.orderId || !['pagada', 'anulada'].includes(order.status);
    const pendingCount = order.items.filter(i => !i.sent).length;
    const localCount = order.items.filter(i => !i.persisted).length;
    const canEdit = canReplace;

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
    }, [tablesRefresh]);

    function showTemp(message, type = 'success') {
        setShowToast({ message, type });
        setTimeout(() => setShowToast(null), 3000);
    }

    function handleAddProduct(product, modifiers, modifierLabels, finalPrice) {
        if (!canAdd) {
            showTemp('La orden ya esta pagada y no se puede editar aqui', 'error');
            return;
        }
        addItem(product, modifiers, modifierLabels, finalPrice);
    }

    function handleRemoveItem(tempId) {
        const item = order.items.find(i => i.tempId === tempId);
        if (!item) return;
        if (!item.persisted || !order.orderId) {
            removeItem(tempId);
            return;
        }
        (async () => {
            try {
                await api.deleteOrderItem(order.orderId, item.id);
                const full = await api.getOrder(order.orderId);
                loadOrder(full);
                showTemp('Producto eliminado', 'success');
                setRefreshParked(r => r + 1);
            } catch (err) {
                showTemp(err.message || 'No se pudo eliminar el producto', 'error');
            }
        })();
    }

    async function handlePark() {
        if (isAppendMode) {
            await handleSaveAppend();
            return;
        }
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

    async function handleSaveAppend() {
        if (localCount === 0) {
            showTemp('No hay productos nuevos para guardar', 'error');
            return;
        }
        setActionBusy(true);
        try {
            const res = await saveOrder();
            if (res.error) throw new Error(res.error);
            showTemp(`${res.added} producto(s) agregado(s) a la orden #${order.orderId}`, 'success');
            setRefreshParked(r => r + 1);
        } catch (err) {
            showTemp(err.message || 'Error al guardar', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    async function handleRetomar(parkedOrder) {
        setActionBusy(true);
        try {
            const full = await api.getOrder(parkedOrder.id);
            loadOrder(full);
            if (full.status && full.status !== 'pausada') {
                showTemp(`Orden #${parkedOrder.id} lista para agregar productos`, 'success');
            } else {
                showTemp(`Orden #${parkedOrder.id} cargada`, 'success');
            }
        } catch {
            showTemp('Error al cargar orden', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    async function handleAnular(parkedOrder) {
        const ok = await confirm({
            title: 'Anular orden',
            message: `¿Seguro que deseas anular la orden #${parkedOrder.id}? Esta acción no se puede deshacer.`,
            confirmLabel: 'Anular orden',
            variant: 'danger',
            icon: 'block',
        });
        if (!ok) return;
        setActionBusy(true);
        try {
            const res = await api.voidOrder(parkedOrder.id);
            if (res.error) throw new Error(res.error);
            showTemp(`Orden #${parkedOrder.id} anulada`, 'success');
            setRefreshParked(r => r + 1);
        } catch (err) {
            showTemp(err.message || 'Error al anular', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    function handleCobrar(parkedOrder) {
        navigate(`/caja?order=${parkedOrder.id}`);
    }

    async function handleSendCurrent() {
        if (!hasItems) {
            showTemp('Agrega productos al ticket primero', 'error');
            return;
        }
        if (!canAdd) {
            showTemp('Esta orden ya fue pagada', 'error');
            return;
        }
        if (!isAppendMode && !order.customerName.trim() && !order.tableId) {
            showTemp('Ingresa nombre de cliente o selecciona mesa', 'error');
            return;
        }

        setActionBusy(true);
        try {
            let orderId = order.orderId;
            if (!orderId || localCount > 0) {
                const res = await saveOrder();
                if (res.error) throw new Error(res.error);
                orderId = res.order_id || orderId;
                if (!orderId) throw new Error('No se pudo guardar la orden');
                const full = await api.getOrder(orderId);
                loadOrder(full);
            }
            await sendToKitchen(orderId);
            showTemp('Orden enviada a cocina', 'success');
            setRefreshParked(r => r + 1);
        } catch (err) {
            showTemp(err.message || 'Error al enviar a cocina', 'error');
        } finally {
            setActionBusy(false);
        }
    }

    async function handleSendParked(parkedOrder) {
        setActionBusy(true);
        try {
            await api.sendToKitchen(parkedOrder.id);
            showTemp(`Orden #${parkedOrder.id} enviada a cocina`, 'success');
            setRefreshParked(r => r + 1);
        } catch (err) {
            showTemp(err.message || 'Error al enviar a cocina', 'error');
        } finally {
            setActionBusy(false);
        }
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
                    {canEdit && <OrderModeToggle mode={order.mode} onChange={setMode} />}
                </div>
            </header>

            {/* Control bar */}
            {canEdit ? (
                <div className="px-4 md:px-6 py-3 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center gap-3 flex-wrap">
                    <div ref={tableSelectorRef}>
                        <TableSelector
                            tables={tables}
                            selectedId={order.tableId}
                            onSelect={(t) => setTable(t.id, t.name)}
                            onClose={() => {}}
                            onStatusChange={() => setTablesRefresh(r => r + 1)}
                            onError={(message) => showTemp(message, 'error')}
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
            ) : (
                <div
                    className="px-4 md:px-6 py-3 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center gap-2 text-[0.8125rem] text-on-surface-variant"
                    data-testid="order-readonly-notice"
                >
                    <span className="material-symbols-outlined text-[16px] text-secondary">restaurant</span>
                    <span>
                        Orden en cocina: la mesa, el cliente y las notas se bloquean. Puedes{' '}
                        <strong className="text-on-surface">agregar productos nuevos</strong> y enviarlos a cocina desde el
                        ticket.
                    </span>
                </div>
            )}

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
                        onRemove={handleRemoveItem}
                        totals={totals}
                        status={order.status}
                        editable={canAdd}
                        allowPersistedEdits={canReplace}
                    />

                    {(pendingCount > 0 || canReplace || (isAppendMode && localCount > 0)) && (
                        <div className="flex gap-2">
                            {pendingCount > 0 && (
                                <button
                                    onClick={handleSendCurrent}
                                    disabled={!hasItems || actionBusy}
                                    className="btn-primary flex-1 text-[0.75rem] py-2 disabled:opacity-50"
                                    data-testid="send-kitchen"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {actionBusy ? 'hourglass_empty' : 'send'}
                                    </span>
                                    Enviar a Cocina ({pendingCount})
                                </button>
                            )}
                            {canReplace && (
                                <button
                                    onClick={handlePark}
                                    disabled={!hasItems || actionBusy}
                                    className={`${pendingCount > 0 ? 'btn-ghost flex-1' : 'btn-primary w-full'} text-[0.75rem] py-2 disabled:opacity-50`}
                                    data-testid="park-order"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {actionBusy ? 'hourglass_empty' : 'pause_circle'}
                                    </span>
                                    Pausar Orden
                                </button>
                            )}
                            {isAppendMode && localCount > 0 && (
                                <button
                                    onClick={handleSaveAppend}
                                    disabled={actionBusy}
                                    className="btn-ghost flex-1 text-[0.75rem] py-2 disabled:opacity-50"
                                    data-testid="save-append"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {actionBusy ? 'hourglass_empty' : 'save'}
                                    </span>
                                    Guardar
                                </button>
                            )}
                        </div>
                    )}

                    <ParkedOrdersPanel
                        onRetomar={handleRetomar}
                        onCobrar={handleCobrar}
                        onAnular={handleAnular}
                        onSend={handleSendParked}
                        onAppend={handleRetomar}
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

            {confirmModal}
        </div>
    );
}
