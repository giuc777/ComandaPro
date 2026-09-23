import { useState, useEffect, useRef } from 'react';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';

const EMPTY_PRODUCT = {
  name: '', category_id: '', price: '', cost: '',
  description: '', badge: '', sort_order: 0
};

const EMPTY_RECIPE_ROW = { inventory_id: '', quantity: '', unit: '' };

export default function ProductosPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [recipe, setRecipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const { confirm, confirmModal } = useConfirm();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    loadProducts();
  }, [filterCategory]);

  async function loadData() {
    setLoading(true);
    try {
      const [prods, cats, inv] = await Promise.all([
        api.getProducts(filterCategory || undefined),
        api.getCategories(),
        api.listInventory()
      ]);
      setProducts(prods);
      setCategories(cats);
      setInventoryItems(inv);
    } catch {
      setProducts([]);
      setCategories([]);
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const prods = await api.getProducts(filterCategory || undefined);
      setProducts(prods);
    } catch { /* ignore */ }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditingProduct(null);
    setForm({ ...EMPTY_PRODUCT });
    setRecipe([{ ...EMPTY_RECIPE_ROW }]);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  async function openEdit(product) {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      category_id: product.category_id || '',
      price: product.price || '',
      cost: product.cost || '',
      description: product.description || '',
      badge: product.badge || '',
      sort_order: product.sort_order || 0,
    });
    setImageFile(null);
    setImagePreview(product.image ? `${api.getUploadUrl(product.image)}` : null);
    setRecipe([]);
    setModalOpen(true);
    try {
      const data = await api.getProductRecipe(product.id);
      const rows = (Array.isArray(data) ? data : []).map(r => ({
        inventory_id: r.inventory_id,
        quantity: r.quantity_per_unit,
        unit: r.ingredient_unit || ''
      }));
      setRecipe(rows.length > 0 ? rows : [{ ...EMPTY_RECIPE_ROW }]);
    } catch {
      setRecipe([{ ...EMPTY_RECIPE_ROW }]);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setRecipe([]);
  }

  function addRecipeRow() {
    setRecipe(prev => [...prev, { ...EMPTY_RECIPE_ROW }]);
  }

  function updateRecipeRow(idx, field, value) {
    setRecipe(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (field === 'inventory_id') {
        const inv = inventoryItems.find(x => String(x.id) === String(value));
        return { ...row, inventory_id: value, unit: inv ? inv.unit : '' };
      }
      return { ...row, [field]: value };
    }));
  }

  function removeRecipeRow(idx) {
    setRecipe(prev => prev.filter((_, i) => i !== idx));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('El nombre es requerido', 'error'); return; }
    if (!form.price || Number(form.price) <= 0) { showToast('El precio debe ser mayor a 0', 'error'); return; }

    const cleanRecipe = recipe
      .filter(r => r.inventory_id && Number(r.quantity) > 0)
      .map(r => ({
        inventory_id: Number(r.inventory_id),
        quantity: Number(r.quantity),
        unit: r.unit || null
      }));

    if (cleanRecipe.length === 0) {
      showToast('Agrega al menos un insumo con cantidad mayor a 0', 'error');
      return;
    }

    const uniqueIds = new Set(cleanRecipe.map(r => r.inventory_id));
    if (uniqueIds.size !== cleanRecipe.length) {
      showToast('No puedes repetir un insumo en la receta', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('category_id', form.category_id || '');
      formData.append('price', form.price);
      formData.append('cost', form.cost || '0');
      formData.append('description', form.description);
      formData.append('badge', form.badge);
      formData.append('sort_order', form.sort_order);
      formData.append('recipe', JSON.stringify(cleanRecipe));

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingProduct) {
        if (!imageFile && imagePreview === null) {
          formData.append('image', '');
        }
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }

      await loadProducts();
      showToast(editingProduct ? 'Producto actualizado' : 'Producto creado');
      closeModal();
    } catch (err) {
      showToast(err.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    const ok = await confirm({
      title: 'Desactivar producto',
      message: `¿Desactivar "${product.name}"? Dejará de aparecer en el menú y el punto de venta.`,
      confirmLabel: 'Desactivar',
      variant: 'danger',
      icon: 'delete',
    });
    if (!ok) return;
    try {
      await api.deleteProduct(product.id);
      await loadProducts();
      showToast('Producto desactivado');
    } catch (err) {
      showToast(err.error || 'Error al eliminar', 'error');
    }
  }

  function getImageUrl(image) {
    if (!image) return null;
    return api.getUploadUrl(image);
  }

  const activeProducts = products.filter(p => p.active !== false);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Productos</h1>
            <span className="text-sm text-on-surface-variant flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
              {activeProducts.length} productos activos
            </span>
          </div>
          <button onClick={openCreate} className="btn-primary text-[0.75rem] py-1.5">
            <span className="material-symbols-outlined text-[16px]">add</span> Nuevo Producto
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Productos</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{activeProducts.length}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Categorias</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{categories.length}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Con imagen</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{activeProducts.filter(p => p.image).length}</div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap transition-colors ${!filterCategory ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(String(cat.id))}
              className={`px-3 py-1.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap transition-colors ${filterCategory === String(cat.id) ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
          </div>
        ) : activeProducts.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">inventory_2</span>
            <p className="text-on-surface-variant mt-2">No hay productos. Crea el primero.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Producto</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Categoria</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Precio</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Costo</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Receta</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Badge</th>
                    <th className="px-4 py-3 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProducts.map(product => (
                    <tr key={product.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">local_cafe</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[0.8125rem] text-on-surface">{product.name}</div>
                            {product.description && (
                              <div className="text-[0.6875rem] text-on-surface-variant line-clamp-1">{product.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-on-surface-variant">{product.category_name || 'Sin categoria'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[0.8125rem] text-on-surface">${Number(product.price).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-on-surface-variant">${Number(product.cost).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {Number(product.recipe_count) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[0.75rem] text-tertiary font-semibold">
                            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                            {product.recipe_count}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-error/10 text-error">Sin receta</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {product.badge ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-tertiary-container text-on-tertiary-container">{product.badge}</span>
                        ) : (
                          <span className="text-on-surface-variant/50">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(product)} className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors" title="Editar">
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(product)} className="p-1.5 rounded-full hover:bg-error-container/30 transition-colors" title="Desactivar">
                            <span className="material-symbols-outlined text-error text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="modal-overlay open" onClick={closeModal}>
          <div className="modal-content max-w-2xl w-[calc(100vw-2rem)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Ej: Latte Vainilla" />
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Categoria</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input-field">
                  <option value="">Sin categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Precio *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field" placeholder="28.00" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Costo</label>
                  <input type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="input-field" placeholder="8.50" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Descripcion</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Descripcion del producto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Badge</label>
                  <input type="text" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="input-field" placeholder="Popular, Nuevo, Top Seller" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Orden</label>
                  <input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="input-field" placeholder="0" />
                </div>
              </div>

              <div className="border-t border-outline-variant/15 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Receta / Insumos *</label>
                  <button type="button" onClick={addRecipeRow} className="btn-ghost text-[0.6875rem] py-0.5">
                    <span className="material-symbols-outlined text-[14px]">add</span> Agregar insumo
                  </button>
                </div>
                <p className="text-[0.625rem] text-on-surface-variant mb-2">
                  Todo producto requiere insumos (insumo &rarr; receta &rarr; producto).
                </p>

                {recipe.length === 0 ? (
                  <div className="text-[0.75rem] text-error bg-error/5 border border-error/20 rounded-lg px-3 py-2">
                    Agrega al menos un insumo para guardar el producto.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recipe.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <select
                            value={row.inventory_id}
                            onChange={e => updateRecipeRow(idx, 'inventory_id', e.target.value)}
                            className="input-field w-full text-[0.75rem] py-2"
                          >
                            <option value="">Seleccionar insumo</option>
                            {inventoryItems
                              .filter(inv =>
                                String(inv.id) === String(row.inventory_id) ||
                                !recipe.some((r, i) => i !== idx && String(r.inventory_id) === String(inv.id))
                              )
                              .map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                          </select>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <input
                            type="number" step="0.001" min="0"
                            value={row.quantity}
                            onChange={e => updateRecipeRow(idx, 'quantity', e.target.value)}
                            className="input-field text-[0.75rem] py-2 text-center"
                            placeholder="Cant."
                          />
                        </div>
                        <span className="text-[0.6875rem] text-on-surface-variant w-14 text-center flex-shrink-0">{row.unit || '-'}</span>
                        <button type="button" onClick={() => removeRecipeRow(idx)} className="p-1 rounded-full hover:bg-error-container/30 transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-error text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Imagen del producto</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/20 flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-[28px]">add_photo_alternate</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="btn-ghost text-[0.75rem] py-1.5 cursor-pointer flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Seleccionar imagen
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {imagePreview && (
                      <button type="button" onClick={handleRemoveImage} className="text-[0.6875rem] text-error font-semibold hover:underline">Quitar imagen</button>
                    )}
                    <span className="text-[0.625rem] text-on-surface-variant">JPG, PNG, WEBP. Max 5MB.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-[0.75rem] py-1.5">
                {saving ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">save</span>
                )}
                {editingProduct ? 'Guardar' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-50 transition-transform duration-300 ${toast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
