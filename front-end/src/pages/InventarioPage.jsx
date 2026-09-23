import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

export default function InventarioPage() {
    const [tab, setTab] = useState('insumos');
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [toast, setToast] = useState(null);
    const { confirm, confirmModal } = useConfirm();

    function showToast(message, type = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    // Recipe state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [recipe, setRecipe] = useState([]);
    const [recipeCost, setRecipeCost] = useState(null);
    const [ingredients, setIngredients] = useState([]);
    const [showRecipeForm, setShowRecipeForm] = useState(false);
    const [recipeFormItem, setRecipeFormItem] = useState({ inventory_id: '', quantity_per_unit: '', unit: 'kg' });

    const loadInventory = useCallback(async () => {
        try {
            const data = await api.listInventory(lowStockOnly);
            setInventory(Array.isArray(data) ? data : []);
        } catch {
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [lowStockOnly]);

    const loadProducts = useCallback(async () => {
        try {
            const data = await api.getProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }, []);

    const loadIngredients = useCallback(async () => {
        try {
            const data = await api.listInventory();
            setIngredients(Array.isArray(data) ? data : []);
        } catch {
            setIngredients([]);
        }
    }, []);

    useEffect(() => { loadInventory(); }, [loadInventory]);
    useEffect(() => { if (tab === 'recetas') loadProducts(); }, [tab, loadProducts]);

    const loadRecipe = async (productId) => {
        setSelectedProduct(productId);
        try {
            const [recipeData, costData] = await Promise.all([
                api.getProductRecipe(productId),
                api.getRecipeCost(productId)
            ]);
            setRecipe(Array.isArray(recipeData) ? recipeData : []);
            setRecipeCost(costData);
        } catch {
            setRecipe([]);
            setRecipeCost(null);
        }
    };

    const handleCreateItem = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const data = {
            name: form.get('name'),
            unit: form.get('unit'),
            stock: Number(form.get('stock')) || 0,
            min_stock: Number(form.get('min_stock')) || 0,
            cost_per_unit: Number(form.get('cost_per_unit')) || 0,
            catalog_item_id: form.get('catalog_item_id') ? Number(form.get('catalog_item_id')) : null
        };
        try {
            await api.createInventoryItem(data);
            setShowForm(false);
            loadInventory();
            showToast('Insumo creado');
        } catch (err) {
            showToast(err.message || 'Error al crear insumo', 'error');
        }
    };

    const handleUpdateStock = async (id, newStock) => {
        try {
            await api.updateStock(id, Number(newStock));
            loadInventory();
        } catch {
            showToast('Error al actualizar stock', 'error');
        }
    };

    const handleDeleteItem = async (id) => {
        const ok = await confirm({
            title: 'Eliminar insumo',
            message: '¿Eliminar este insumo del inventario? Esta acción no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'danger',
            icon: 'delete',
        });
        if (!ok) return;
        try {
            await api.deleteInventoryItem(id);
            loadInventory();
            showToast('Insumo eliminado');
        } catch (err) {
            const msg = err.message || 'Error al eliminar';
            showToast(msg.includes('recetas activas') ? 'No se puede eliminar: tiene recetas activas' : msg, 'error');
        }
    };

    const handleAddRecipeItem = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            await api.upsertRecipeItem(selectedProduct, {
                inventory_id: Number(recipeFormItem.inventory_id),
                quantity_per_unit: Number(recipeFormItem.quantity_per_unit),
                unit: recipeFormItem.unit
            });
            setShowRecipeForm(false);
            setRecipeFormItem({ inventory_id: '', quantity_per_unit: '', unit: 'kg' });
            loadRecipe(selectedProduct);
            showToast('Ingrediente guardado');
        } catch (err) {
            showToast(err.message || 'Error al guardar ingrediente', 'error');
        }
    };

    const handleDeleteRecipeItem = async (recipeId) => {
        const ok = await confirm({
            title: 'Quitar ingrediente',
            message: '¿Quitar este ingrediente de la receta?',
            confirmLabel: 'Quitar',
            variant: 'danger',
            icon: 'delete',
        });
        if (!ok) return;
        try {
            await api.deleteRecipeItem(recipeId);
            loadRecipe(selectedProduct);
            showToast('Ingrediente eliminado');
        } catch (err) {
            showToast(err.message || 'Error al eliminar', 'error');
        }
    };

    const criticalItems = inventory.filter(i => i.status === 'critical');
    const totalValue = inventory.reduce((s, i) => s + (i.stock * i.cost_per_unit), 0);

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-lg text-primary font-semibold">Inventario</h1>
                        <span className="text-sm text-on-surface-variant flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
                            {inventory.length} insumos activos
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setTab('insumos'); setShowForm(true); setEditingItem(null); }}
                            className="btn-primary text-[0.75rem] py-1.5"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span> Nuevo
                        </button>
                    </div>
                </div>
                <div className="px-4 md:px-6 pb-2 flex gap-2">
                    <button
                        onClick={() => setTab('insumos')}
                        className={`tab-pill ${tab === 'insumos' ? 'active' : ''}`}
                    >
                        Insumos <span className="badge bg-primary-container/20 text-primary ml-1">{inventory.length}</span>
                    </button>
                    <button
                        onClick={() => setTab('recetas')}
                        className={`tab-pill ${tab === 'recetas' ? 'active' : ''}`}
                    >
                        Recetas
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
                {tab === 'insumos' ? (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="kpi-card">
                                <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Valorizacion</span>
                                <div className="font-display text-lg text-on-surface font-bold mt-1">{formatCurrency(totalValue)}</div>
                            </div>
                            <div className={`kpi-card ${criticalItems.length > 0 ? 'border border-error/30' : ''}`}>
                                <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Criticos</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`font-display text-lg font-bold ${criticalItems.length > 0 ? 'text-error' : 'text-on-surface'}`}>{criticalItems.length}</span>
                                    {criticalItems.length > 0 && <span className="material-symbols-outlined text-error text-[16px]">warning</span>}
                                </div>
                            </div>
                            <div className="kpi-card">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lowStockOnly}
                                        onChange={(e) => setLowStockOnly(e.target.checked)}
                                        className="accent-error w-4 h-4"
                                    />
                                    <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Solo criticos</span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-outline-variant/15 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">
                                        <th className="text-left px-4 py-2.5">Insumo</th>
                                        <th className="text-left px-4 py-2.5">Stock</th>
                                        <th className="text-left px-4 py-2.5">Minimo</th>
                                        <th className="text-left px-4 py-2.5">Costo/Unidad</th>
                                        <th className="text-left px-4 py-2.5">Estado</th>
                                        <th className="text-right px-4 py-2.5">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="px-4 py-8 text-center text-on-surface-variant">Cargando...</td></tr>
                                    ) : inventory.length === 0 ? (
                                        <tr><td colSpan="6" className="px-4 py-8 text-center text-on-surface-variant">No hay insumos</td></tr>
                                    ) : inventory.map((item) => (
                                        <tr key={item.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-[0.8125rem] text-on-surface block">{item.name}</span>
                                                <span className="text-[0.6875rem] text-on-surface-variant">{item.unit}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    defaultValue={item.stock}
                                                    onBlur={(e) => handleUpdateStock(item.id, e.target.value)}
                                                    className="w-20 bg-transparent border border-outline-variant/30 rounded px-2 py-1 text-[0.8125rem] text-on-surface text-right focus:outline-none focus:border-primary"
                                                    step="0.001"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-on-surface-variant text-[0.8125rem]">{item.min_stock} {item.unit}</td>
                                            <td className="px-4 py-3 text-on-surface-variant text-[0.8125rem]">{formatCurrency(item.cost_per_unit)}/{item.unit}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${item.status === 'critical' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
                                                    {item.status === 'critical' ? 'Critico' : 'OK'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="btn-ghost py-1 text-[0.6875rem] text-error"
                                                    title="Eliminar"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
                            <div className="px-4 py-3 border-b border-outline-variant/15">
                                <h2 className="font-semibold text-[0.875rem] text-on-surface">Selecciona un producto para ver/editar su receta</h2>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {products.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => loadRecipe(p.id)}
                                        className={`w-full text-left px-4 py-2.5 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors ${selectedProduct === p.id ? 'bg-primary-container/10 border-l-2 border-l-primary' : ''}`}
                                    >
                                        <span className="font-semibold text-[0.8125rem] text-on-surface">{p.name}</span>
                                        <span className="text-[0.6875rem] text-on-surface-variant ml-2">{formatCurrency(p.price)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedProduct && (
                            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
                                <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-[0.875rem] text-on-surface">
                                            Receta: {products.find(p => p.id === selectedProduct)?.name}
                                        </h3>
                                        {recipeCost && (
                                            <div className="flex gap-4 mt-1 text-[0.75rem]">
                                                <span className="text-on-surface-variant">Costo declarado: <strong>{formatCurrency(recipeCost.stated_cost)}</strong></span>
                                                <span className={recipeCost.recipe_cost > recipeCost.stated_cost ? 'text-error' : 'text-tertiary'}>
                                                    Costo receta: <strong>{formatCurrency(recipeCost.recipe_cost)}</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => { setShowRecipeForm(true); loadIngredients(); }}
                                        className="btn-primary text-[0.75rem] py-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add</span> Agregar
                                    </button>
                                </div>

                                {showRecipeForm && (
                                    <form onSubmit={handleAddRecipeItem} className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-low/50 flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Ingrediente</label>
                                            <select
                                                value={recipeFormItem.inventory_id}
                                                onChange={(e) => setRecipeFormItem({ ...recipeFormItem, inventory_id: e.target.value })}
                                                className="w-full border border-outline-variant/30 rounded-lg px-3 py-1.5 text-[0.8125rem] mt-1"
                                                required
                                            >
                                                <option value="">Seleccionar...</option>
                                                {ingredients.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Cantidad</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={recipeFormItem.quantity_per_unit}
                                                onChange={(e) => setRecipeFormItem({ ...recipeFormItem, quantity_per_unit: e.target.value })}
                                                className="w-full border border-outline-variant/30 rounded-lg px-3 py-1.5 text-[0.8125rem] mt-1"
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[0.6875rem] text-on-surface-variant font-bold">Unidad</label>
                                            <select
                                                value={recipeFormItem.unit}
                                                onChange={(e) => setRecipeFormItem({ ...recipeFormItem, unit: e.target.value })}
                                                className="w-full border border-outline-variant/30 rounded-lg px-3 py-1.5 text-[0.8125rem] mt-1"
                                            >
                                                <option value="kg">kg</option>
                                                <option value="litros">litros</option>
                                                <option value="ml">ml</option>
                                                <option value="piezas">piezas</option>
                                            </select>
                                        </div>
                                        <button type="submit" className="btn-primary text-[0.75rem] py-1.5">Guardar</button>
                                        <button type="button" onClick={() => setShowRecipeForm(false)} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
                                    </form>
                                )}

                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-outline-variant/15 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">
                                            <th className="text-left px-4 py-2.5">Ingrediente</th>
                                            <th className="text-right px-4 py-2.5">Cantidad</th>
                                            <th className="text-right px-4 py-2.5">Stock</th>
                                            <th className="text-right px-4 py-2.5">Costo linea</th>
                                            <th className="text-right px-4 py-2.5">Accion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recipe.length === 0 ? (
                                            <tr><td colSpan="5" className="px-4 py-6 text-center text-on-surface-variant text-[0.8125rem]">Sin ingredientes definidos</td></tr>
                                        ) : recipe.map((r) => (
                                            <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                                                <td className="px-4 py-2.5 font-semibold text-[0.8125rem] text-on-surface">{r.ingredient_name}</td>
                                                <td className="px-4 py-2.5 text-right text-[0.8125rem]">{r.quantity_per_unit} {r.unit}</td>
                                                <td className="px-4 py-2.5 text-right text-[0.8125rem]">{r.stock} {r.ingredient_unit}</td>
                                                <td className="px-4 py-2.5 text-right text-[0.8125rem]">{formatCurrency(r.line_cost)}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button
                                                        onClick={() => handleDeleteRecipeItem(r.id)}
                                                        className="btn-ghost py-1 text-[0.6875rem] text-error"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>

            {showForm && tab === 'insumos' && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-outline-variant/15">
                            <h2 className="font-display text-lg text-on-surface font-semibold">Nuevo Insumo</h2>
                        </div>
                        <form onSubmit={handleCreateItem} className="px-6 py-4 flex flex-col gap-3">
                            <div>
                                <label className="text-[0.75rem] text-on-surface-variant font-bold">Nombre</label>
                                <input name="name" required className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Unidad</label>
                                    <select name="unit" required className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1">
                                        <option value="kg">kg</option>
                                        <option value="litros">litros</option>
                                        <option value="ml">ml</option>
                                        <option value="piezas">piezas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Costo/Unidad</label>
                                    <input name="cost_per_unit" type="number" step="0.01" defaultValue="0" className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Stock inicial</label>
                                    <input name="stock" type="number" step="0.001" defaultValue="0" className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                                </div>
                                <div>
                                    <label className="text-[0.75rem] text-on-surface-variant font-bold">Stock minimo</label>
                                    <input name="min_stock" type="number" step="0.001" defaultValue="0" className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-[0.875rem] mt-1" />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button type="submit" className="btn-primary flex-1 py-2">Crear</button>
                                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-50 ${toast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            {confirmModal}
        </div>
    );
}
