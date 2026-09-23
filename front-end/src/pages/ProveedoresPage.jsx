import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PO_STATUS = { pending: 'Pendiente', received: 'Recibida', cancelled: 'Cancelada' };
const PO_STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-800', received: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-500' };

export default function ProveedoresPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierDetail, setSupplierDetail] = useState(null);
    const [showSupplierForm, setShowSupplierForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [showPOForm, setShowPOForm] = useState(false);
    const [showPODetail, setShowPODetail] = useState(null);
    const [poDetail, setPoDetail] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [showAddItem, setShowAddItem] = useState(false);
    const [addItemForm, setAddItemForm] = useState({ inventory_id: '', quantity: '', unit_cost: '' });
    const [toast, setToast] = useState(null);
    const { confirm, confirmModal } = useConfirm();

    function showToast(message, type = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    const loadSuppliers = useCallback(async () => {
        try {
            const data = await api.listSuppliers(true);
            setSuppliers(Array.isArray(data) ? data : []);
        } catch {
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

    const loadSupplierDetail = async (id) => {
        setSelectedSupplier(id);
        try {
            const data = await api.getSupplierDetail(id);
            setSupplierDetail(data);
        } catch {
            setSupplierDetail(null);
        }
    };

    const loadPODetail = async (poId) => {
        setShowPODetail(poId);
        try {
            const data = await api.getPurchaseOrder(poId);
            setPoDetail(data);
        } catch {
            setPoDetail(null);
        }
    };

    const loadInventory = async () => {
        try {
            const data = await api.listInventory();
            setInventory(Array.isArray(data) ? data : []);
        } catch {
            setInventory([]);
        }
    };

    const handleCreateSupplier = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = {
            name: form.get('name'),
            contact_name: form.get('contact_name'),
            phone: form.get('phone'),
            email: form.get('email'),
            address: form.get('address'),
            notes: form.get('notes')
        };
        try {
            if (editingSupplier) {
                await api.updateSupplier(editingSupplier.id, { ...data, status: editingSupplier.status });
            } else {
                await api.createSupplier(data);
            }
            setShowSupplierForm(false);
            setEditingSupplier(null);
            loadSuppliers();
            showToast(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado');
        } catch (err) {
            showToast(err.message || 'Error al guardar', 'error');
        }
    };

    const handleCreatePO = async (supplierId) => {
        try {
            const result = await api.createPurchaseOrder({ supplier_id: supplierId, notes: '' });
            if (result.id) {
                await loadPODetail(result.id);
                loadSuppliers();
            }
        } catch (err) {
            showToast(err.message || 'Error al crear orden', 'error');
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!showPODetail) return;
        try {
            await api.addPoItem(showPODetail, {
                inventory_id: Number(addItemForm.inventory_id),
                quantity: Number(addItemForm.quantity),
                unit_cost: Number(addItemForm.unit_cost)
            });
            setShowAddItem(false);
            setAddItemForm({ inventory_id: '', quantity: '', unit_cost: '' });
            loadPODetail(showPODetail);
        } catch (err) {
            showToast(err.message || 'Error al agregar item', 'error');
        }
    };

    const handleDeleteItem = async (itemId) => {
        const ok = await confirm({
            title: 'Quitar item',
            message: '¿Quitar este item de la orden de compra?',
            confirmLabel: 'Quitar',
            variant: 'danger',
            icon: 'delete',
        });
        if (!ok) return;
        try {
            await api.deletePoItem(showPODetail, itemId);
            loadPODetail(showPODetail);
        } catch (err) {
            showToast(err.message || 'Error al eliminar', 'error');
        }
    };

    const handleReceivePO = async (poId) => {
        const ok = await confirm({
            title: 'Recibir orden',
            message: '¿Recibir esta orden de compra? Se agregará el stock al inventario.',
            confirmLabel: 'Recibir',
            icon: 'inventory_2',
        });
        if (!ok) return;
        try {
            await api.receivePurchaseOrder(poId);
            loadPODetail(poId);
            loadSuppliers();
            showToast('Orden recibida');
        } catch (err) {
            showToast(err.message || 'Error al recibir', 'error');
        }
    };

    const handleCancelPO = async (poId) => {
        const ok = await confirm({
            title: 'Cancelar orden',
            message: '¿Cancelar esta orden de compra? Esta acción no se puede deshacer.',
            confirmLabel: 'Cancelar orden',
            variant: 'danger',
            icon: 'block',
        });
        if (!ok) return;
        try {
            await api.cancelPurchaseOrder(poId);
            loadPODetail(poId);
            showToast('Orden cancelada');
        } catch (err) {
            showToast(err.message || 'Error al cancelar', 'error');
        }
    };

    const activeSuppliers = suppliers.filter(s => s.status === 'Activo');

    // Detail view
    if (selectedSupplier && supplierDetail) {
        const s = supplierDetail.supplier;
        const pos = supplierDetail.purchaseOrders || [];
        return (
            <>
            <div className="flex flex-col min-h-screen bg-surface">
                <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                    <div className="px-4 md:px-6 py-3 flex items-center gap-3">
                        <button onClick={() => { setSelectedSupplier(null); setSupplierDetail(null); }} className="btn-ghost p-1">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="flex-1">
                            <h1 className="font-display text-lg text-primary font-semibold">{s?.name}</h1>
                            <span className="text-sm text-on-surface-variant">{s?.contact_name}</span>
                        </div>
                        <button onClick={() => { setEditingSupplier(s); setShowSupplierForm(true); }} className="btn-ghost text-[0.75rem]">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                        <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px]">phone</span> {s?.phone || '—'}
                            </div>
                            <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px]">mail</span> {s?.email || '—'}
                            </div>
                            <div className="flex items-center gap-2 text-on-surface-variant col-span-2">
                                <span className="material-symbols-outlined text-[16px]">location_on</span> {s?.address || '—'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-[0.875rem] text-on-surface">Ordenes de Compra</h2>
                        <button onClick={() => handleCreatePO(selectedSupplier)} className="btn-primary text-[0.75rem] py-1.5">
                            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span> Nueva Orden
                        </button>
                    </div>

                    {pos.length === 0 ? (
                        <div className="text-center text-on-surface-variant py-8">Sin ordenes de compra</div>
                    ) : pos.map(po => (
                        <div key={po.id} onClick={() => loadPODetail(po.id)}
                            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-[0.875rem]">PO #{po.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${PO_STATUS_COLOR[po.status] || ''}`}>
                                    {PO_STATUS[po.status] || po.status}
                                </span>
                            </div>
                            <div className="flex justify-between text-[0.75rem] text-on-surface-variant">
                                <span>{po.item_count} items</span>
                                <span className="font-semibold text-on-surface">{formatCurrency(po.total)}</span>
                            </div>
                            <div className="text-[0.6875rem] text-on-surface-variant mt-1">{formatDate(po.created_at)}</div>
                        </div>
                    ))}
                </main>

                {/* PO Detail Modal */}
                {showPODetail && poDetail && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center" onClick={() => { setShowPODetail(null); setPoDetail(null); }}>
                        <div className="bg-surface-container-lowest rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between">
                                <h2 className="font-display text-lg font-semibold">PO #{poDetail.order?.id}</h2>
                                <div className="flex gap-2">
                                    {poDetail.order?.status === 'pending' && (
                                        <>
                                            <button onClick={() => { loadInventory(); setShowAddItem(true); }} className="btn-primary text-[0.75rem] py-1">
                                                <span className="material-symbols-outlined text-[14px]">add</span> Item
                                            </button>
                                            <button onClick={() => handleReceivePO(poDetail.order.id)} className="btn-primary text-[0.75rem] py-1 bg-green-600 hover:bg-green-700">
                                                <span className="material-symbols-outlined text-[14px]">inventory_2</span> Recibir
                                            </button>
                                            <button onClick={() => handleCancelPO(poDetail.order.id)} className="btn-ghost text-[0.75rem] py-1 text-error">
                                                <span className="material-symbols-outlined text-[14px]">cancel</span>
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => { setShowPODetail(null); setPoDetail(null); }} className="btn-ghost p-1">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-4">
                                <div className="flex justify-between text-[0.8125rem] mb-4">
                                    <span className="text-on-surface-variant">Total</span>
                                    <span className="font-display font-bold text-on-surface">{formatCurrency(poDetail.order?.total)}</span>
                                </div>

                                {showAddItem && (
                                    <form onSubmit={handleAddItem} className="bg-surface-container-low/50 rounded-xl p-3 mb-4 flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Insumo</label>
                                            <select value={addItemForm.inventory_id} onChange={e => setAddItemForm({...addItemForm, inventory_id: e.target.value})}
                                                className="w-full border border-outline-variant/30 rounded-lg px-2 py-1.5 text-[0.8125rem] mt-1" required>
                                                <option value="">...</option>
                                                {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-20">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Cant.</label>
                                            <input type="number" step="0.001" value={addItemForm.quantity} onChange={e => setAddItemForm({...addItemForm, quantity: e.target.value})}
                                                className="w-full border border-outline-variant/30 rounded-lg px-2 py-1.5 text-[0.8125rem] mt-1" required />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Costo</label>
                                            <input type="number" step="0.01" value={addItemForm.unit_cost} onChange={e => setAddItemForm({...addItemForm, unit_cost: e.target.value})}
                                                className="w-full border border-outline-variant/30 rounded-lg px-2 py-1.5 text-[0.8125rem] mt-1" required />
                                        </div>
                                        <button type="submit" className="btn-primary text-[0.75rem] py-1.5">OK</button>
                                        <button type="button" onClick={() => setShowAddItem(false)} className="btn-ghost text-[0.75rem] py-1.5">X</button>
                                    </form>
                                )}

                                <div className="flex flex-col gap-2">
                                    {(poDetail.items || []).map(item => (
                                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                                            <div>
                                                <span className="font-semibold text-[0.8125rem]">{item.inventory_name}</span>
                                                <span className="text-[0.75rem] text-on-surface-variant ml-2">{item.quantity} {item.unit}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[0.8125rem]">{formatCurrency(item.line_total)}</span>
                                                {poDetail.order?.status === 'pending' && (
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-error">
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-[80] ${toast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            {confirmModal}
            </>
        );
    }

    // List view
    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="font-display text-lg text-primary font-semibold">Proveedores</h1>
                            <span className="badge bg-primary-container text-on-primary">{activeSuppliers.length}</span>
                        </div>
                    </div>
                    <button onClick={() => { setEditingSupplier(null); setShowSupplierForm(true); }}
                        className="btn-primary py-1 px-2 text-[0.75rem]">
                        <span className="material-symbols-outlined text-[14px]">person_add</span> Nuevo
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="kpi-card">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Activos</span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold">{activeSuppliers.length}</span>
                    </div>
                    <div className="kpi-card">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-secondary text-[18px]">local_shipping</span>
                            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Total</span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold">{suppliers.length}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {loading ? (
                        <div className="text-center text-on-surface-variant py-8">Cargando...</div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center text-on-surface-variant py-8">Sin proveedores</div>
                    ) : suppliers.map(supplier => (
                        <div key={supplier.id} onClick={() => loadSupplierDetail(supplier.id)}
                            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center">
                                        <span className="material-symbols-outlined text-on-secondary-container text-[20px]">business</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-[0.875rem] text-on-surface block">{supplier.name}</span>
                                        <span className="text-[0.75rem] text-on-surface-variant">{supplier.contact_name}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${supplier.status === 'Activo' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                                    {supplier.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[0.75rem]">
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[14px]">phone</span> {supplier.phone || '—'}
                                </div>
                                <div className="flex items-center gap-1.5 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[14px]">mail</span> {supplier.email || '—'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Supplier Form Modal */}
            {showSupplierForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }}>
                    <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-outline-variant/15">
                            <h2 className="font-display text-lg text-on-surface font-semibold">{editingSupplier ? 'Editar' : 'Nuevo'} Proveedor</h2>
                        </div>
                        <form onSubmit={handleCreateSupplier} className="px-6 py-4 flex flex-col gap-3">
                            <div>
                                <label className="text-[0.75rem] text-on-surface-variant font-bold">Nombre</label>
                                <input name="name" defaultValue={editingSupplier?.name || ''} required className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Contacto</label>
                                    <input name="contact_name" defaultValue={editingSupplier?.contact_name || ''} className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                                </div>
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Telefono</label>
                                    <input name="phone" defaultValue={editingSupplier?.phone || ''} className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[0.75rem] text-on-surface-variant font-bold">Email</label>
                                <input name="email" type="email" defaultValue={editingSupplier?.email || ''} className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                            </div>
                            <div>
                                <label className="text-[0.75rem] text-on-surface-variant font-bold">Direccion</label>
                                <input name="address" defaultValue={editingSupplier?.address || ''} className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                            </div>
                            <div>
                                <label className="text-[0.75rem] text-on-surface-variant font-bold">Notas</label>
                                <textarea name="notes" defaultValue={editingSupplier?.notes || ''} rows="2" className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button type="submit" className="btn-primary flex-1 py-2">{editingSupplier ? 'Actualizar' : 'Crear'}</button>
                                <button type="button" onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }} className="btn-ghost flex-1 py-2">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-[80] ${toast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            {confirmModal}
        </div>
    );
}
