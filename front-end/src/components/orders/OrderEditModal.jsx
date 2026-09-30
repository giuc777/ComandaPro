import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import TableSelector from '../TableSelector';
import CustomerNameInput from '../CustomerNameInput';
import OrderModeToggle from '../OrderModeToggle';
import ProductosPos from '../ProductosPos';
import { formatCurrency } from '../../utils/format';

const TAX_RATE = 0.12;
const QTY_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

function normalizeItem(item) {
    return {
        item_id: item.id ?? null,
        product_id: Number(item.product_id),
        product_name: item.product_name || 'Producto',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        modifier_labels: item.modifier_labels || '',
        modifiers: item.modifiers ?? null,
        notes: item.notes || '',
        sent: Boolean(item.sent)
    };
}

export default function OrderEditModal({ order, onClose, onSave }) {
    const readOnly = order.status === 'pagada' || order.status === 'anulada';

    const [tables, setTables] = useState([]);
    const [form, setForm] = useState({
        table_id: order.table_id || null,
        customer_name: order.customer_name || '',
        mode: order.mode || 'mesa',
        notes: order.notes || ''
    });
    const [items, setItems] = useState(() => (order.items || []).map(normalizeItem));
    const [showProducts, setShowProducts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (readOnly) return;
        let alive = true;
        api.getTables()
            .then(data => { if (alive) setTables(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setTables([]); });
        return () => { alive = false; };
    }, [readOnly]);

    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape' && !saving) onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    function updateItem(index, patch) {
        setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function removeItem(index) {
        setItems(prev => prev.filter((_, i) => i !== index));
    }

    function handleAddProduct(product, modifiers, labels, finalPrice) {
        setItems(prev => [...prev, {
            item_id: null,
            product_id: Number(product.id),
            product_name: product.name,
            quantity: 1,
            unit_price: Number(finalPrice),
            modifier_labels: labels || '',
            modifiers: modifiers || [],
            notes: '',
            sent: false
        }]);
        setShowProducts(false);
    }

    async function handleSave() {
        if (items.length === 0) {
            setError('La orden no puede quedar sin productos');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSave({
                table_id: form.mode === 'mesa' ? (form.table_id || null) : null,
                customer_name: (form.customer_name || '').trim() || null,
                mode: form.mode,
                notes: (form.notes || '').trim() || null,
                items: items.map(item => ({
                    ...(item.item_id != null ? { item_id: item.item_id } : {}),
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    ...(item.modifiers !== null && item.modifiers !== '' ? { modifiers: item.modifiers } : {}),
                    modifier_labels: item.modifier_labels || null,
                    notes: item.notes || null
                }))
            });
        } catch (e) {
            setError(e?.message || 'No se pudo guardar la orden');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay open" onClick={() => !saving && onClose()}>
            <div
                className="modal-content w-full max-w-3xl"
                onClick={e => e.stopPropagation()}
                data-testid="order-edit-modal"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">
                            {readOnly ? 'visibility' : 'edit'}
                        </span>
                        <div>
                            <h2 className="font-display text-lg text-on-surface font-semibold">
                                {readOnly ? `Orden #${order.id}` : `Editar orden #${order.id}`}
                            </h2>
                            <span className="text-sm text-on-surface-variant">
                                {readOnly ? 'Detalle de la orden' : 'Cabecera, cantidades y productos'}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => !saving && onClose()} className="p-1 rounded-full hover:bg-surface-container-high">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-error/40 bg-error-container/40 px-4 py-2"
                        data-testid="order-edit-error"
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

                <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
                    <section className="bg-surface-container rounded-2xl border border-outline-variant/15 p-4">
                        <h3 className="font-display text-sm font-semibold text-on-surface mb-3">Cabecera</h3>
                        <div className="flex flex-wrap items-center gap-3">
                            {form.mode === 'mesa' && !readOnly && (
                                <TableSelector
                                    tables={tables}
                                    selectedId={form.table_id}
                                    onSelect={table => setForm(prev => ({ ...prev, table_id: table.id }))}
                                />
                            )}
                            {form.mode === 'mesa' && readOnly && (
                                <span className="text-[0.8125rem] text-on-surface-variant flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                                    {order.table_name || 'Sin mesa'}
                                </span>
                            )}
                            <OrderModeToggle
                                mode={form.mode}
                                onChange={mode => setForm(prev => ({ ...prev, mode }))}
                            />
                            <div className="flex-1 min-w-[200px]">
                                {readOnly ? (
                                    <div className="text-[0.8125rem] text-on-surface-variant">
                                        Cliente: <span className="font-semibold text-on-surface">{form.customer_name || 'Sin cliente'}</span>
                                    </div>
                                ) : (
                                    <CustomerNameInput
                                        value={form.customer_name}
                                        onChange={value => setForm(prev => ({ ...prev, customer_name: value }))}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="mt-3">
                            {readOnly ? (
                                <p className="text-[0.8125rem] text-on-surface-variant">
                                    Notas: {form.notes || 'Sin notas'}
                                </p>
                            ) : (
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Notas de la orden (opcional)"
                                    rows={2}
                                    className="input-field w-full text-[0.8125rem] resize-none"
                                    data-testid="order-notes"
                                />
                            )}
                        </div>
                    </section>

                    <section className="bg-surface-container rounded-2xl border border-outline-variant/15 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-display text-sm font-semibold text-on-surface">Productos</h3>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => setShowProducts(prev => !prev)}
                                    className="btn-primary text-[0.7rem] py-1"
                                    data-testid="toggle-products"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                                    {showProducts ? 'Ocultar catálogo' : 'Agregar producto'}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-2" data-testid="order-items">
                            {items.length === 0 && (
                                <p className="text-center text-[0.8125rem] text-on-surface-variant py-4">
                                    Sin productos
                                </p>
                            )}
                            {items.map((item, index) => (
                                <div
                                    key={`${item.item_id ?? 'new'}-${index}`}
                                    className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-3"
                                    data-testid={`order-item-${index}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-[0.8125rem] text-on-surface truncate">
                                                    {item.product_name}
                                                </span>
                                                <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full ${item.sent ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-primary-container/20 text-primary'}`}>
                                                    {item.sent ? 'Enviado' : 'Nuevo'}
                                                </span>
                                            </div>
                                            {item.modifier_labels && (
                                                <span className="text-[0.6875rem] text-on-surface-variant block mt-0.5">
                                                    {item.modifier_labels}
                                                </span>
                                            )}
                                            <span className="text-[0.6875rem] text-on-surface-variant block mt-0.5">
                                                {formatCurrency(item.unit_price)} c/u
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-display text-sm font-bold text-primary tabular-nums">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <label className="text-[0.6875rem] text-on-surface-variant">Cantidad</label>
                                        <select
                                            value={item.quantity}
                                            disabled={readOnly}
                                            onChange={e => updateItem(index, { quantity: Number(e.target.value) })}
                                            className="bg-surface-container rounded-lg border border-outline-variant/40 px-2 py-1 text-[0.75rem] font-semibold text-on-surface disabled:opacity-60"
                                            data-testid={`qty-order-item-${index}`}
                                        >
                                            {QTY_OPTIONS.map(qty => <option key={qty} value={qty}>{qty}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            value={item.notes}
                                            disabled={readOnly}
                                            onChange={e => updateItem(index, { notes: e.target.value })}
                                            placeholder="Nota del ítem"
                                            className="flex-1 min-w-0 bg-surface-container rounded-lg border border-outline-variant/40 px-2 py-1 text-[0.75rem] text-on-surface disabled:opacity-60"
                                            data-testid={`notes-order-item-${index}`}
                                        />
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="btn-ghost text-error text-[0.6875rem] py-1 px-2 text-error hover:text-error"
                                                data-testid={`remove-order-item-${index}`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {showProducts && !readOnly && (
                            <div className="mt-4 border-t border-outline-variant/15 pt-4 max-h-[45vh] overflow-y-auto" data-testid="products-picker">
                                <ProductosPos
                                    onAddProduct={handleAddProduct}
                                    selectedCategory={null}
                                    onCategorySelect={() => {}}
                                />
                            </div>
                        )}
                    </section>

                    <section className="bg-surface-container rounded-2xl border border-outline-variant/15 p-4">
                        <h3 className="font-display text-sm font-semibold text-on-surface mb-3">Totales</h3>
                        <div className="flex flex-col gap-1.5 text-[0.8125rem]">
                            <div className="flex justify-between text-on-surface-variant">
                                <span>Subtotal</span>
                                <span className="tabular-nums" data-testid="modal-subtotal">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                                <span>IVA 12%</span>
                                <span className="tabular-nums" data-testid="modal-tax">{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-on-surface pt-1.5 border-t border-outline-variant/15">
                                <span>Total</span>
                                <span className="font-display text-primary" data-testid="modal-total">{formatCurrency(total)}</span>
                            </div>
                        </div>
                        <p className="text-[0.6875rem] text-on-surface-variant opacity-70 mt-2">
                            Los totales finales los recalcula el servidor.
                        </p>
                    </section>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-outline-variant/15">
                    <button onClick={() => !saving && onClose()} className="btn-ghost flex-1" disabled={saving}>
                        {readOnly ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex-1"
                            data-testid="save-order"
                        >
                            <span className={`material-symbols-outlined text-[16px] ${saving ? 'animate-spin' : ''}`}>
                                {saving ? 'progress_activity' : 'save'}
                            </span>
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
