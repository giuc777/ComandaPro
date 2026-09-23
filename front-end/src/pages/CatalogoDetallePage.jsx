import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';

const MOCK_ITEMS = {
  categorias_producto: [
    { id: 1, group_id: 1, name: 'Bebidas Calientes', icon: 'local_cafe', color: '#543310', sort_order: 1, parent_name: null },
    { id: 2, group_id: 1, name: 'Bebidas Frios', icon: 'ice_drink', color: '#0061a4', sort_order: 2, parent_name: null },
    { id: 3, group_id: 1, name: 'Comida', icon: 'restaurant', color: '#006b3f', sort_order: 3, parent_name: null },
    { id: 4, group_id: 1, name: 'Postres', icon: 'cake', color: '#9c4221', sort_order: 4, parent_name: null },
    { id: 5, group_id: 1, name: 'Alimentos', icon: 'lunch_dining', color: '#543310', sort_order: 5, parent_name: null },
  ],
  tipos_bebida: [
    { id: 6, group_id: 2, name: 'Espresso', icon: 'coffee', color: '#543310', sort_order: 1, parent_name: null },
    { id: 7, group_id: 2, name: 'Filtrados', icon: 'filter_drip', color: '#543310', sort_order: 2, parent_name: null },
    { id: 8, group_id: 2, name: 'Cold Brew', icon: 'ac_unit', color: '#0061a4', sort_order: 3, parent_name: null },
    { id: 9, group_id: 2, name: 'Smoothies', icon: 'blender', color: '#006b3f', sort_order: 4, parent_name: null },
    { id: 10, group_id: 2, name: 'Tes', icon: 'spa', color: '#002b26', sort_order: 5, parent_name: null },
  ],
  tamanos: [
    { id: 11, group_id: 3, name: 'Pequeno (8oz)', icon: 'size_small', color: null, sort_order: 1, parent_name: null },
    { id: 12, group_id: 3, name: 'Mediano (12oz)', icon: 'size_medium', color: null, sort_order: 2, parent_name: null },
    { id: 13, group_id: 3, name: 'Grande (16oz)', icon: 'size_large', color: null, sort_order: 3, parent_name: null },
    { id: 14, group_id: 3, name: 'Familiar (20oz)', icon: 'sports_bar', color: null, sort_order: 4, parent_name: null },
  ],
  metodos_preparacion: [
    { id: 15, group_id: 4, name: 'Italiano', icon: 'machine', color: null, sort_order: 1, parent_name: null },
    { id: 16, group_id: 4, name: 'Americano', icon: 'coffee', color: null, sort_order: 2, parent_name: null },
    { id: 17, group_id: 4, name: 'V60', icon: 'architecture', color: null, sort_order: 3, parent_name: null },
    { id: 18, group_id: 4, name: 'Chemex', icon: 'science', color: null, sort_order: 4, parent_name: null },
    { id: 19, group_id: 4, name: 'Aeropress', icon: 'sports_mma', color: null, sort_order: 5, parent_name: null },
  ],
  ingredientes_principales: [
    { id: 20, group_id: 5, name: 'Cafe Arabica', icon: 'coffee', color: '#543310', sort_order: 1, parent_name: null },
    { id: 21, group_id: 5, name: 'Leche Entera', icon: 'water_drop', color: '#f5f5f5', sort_order: 2, parent_name: null },
    { id: 22, group_id: 5, name: 'Leche de Avena', icon: 'grass', color: '#006b3f', sort_order: 3, parent_name: null },
    { id: 23, group_id: 5, name: 'Chocolate', icon: 'cookie', color: '#9c4221', sort_order: 4, parent_name: null },
    { id: 24, group_id: 5, name: 'Vainilla', icon: 'local_florist', color: '#9c4221', sort_order: 5, parent_name: null },
    { id: 25, group_id: 5, name: 'Matcha', icon: 'eco', color: '#006b3f', sort_order: 6, parent_name: null },
  ],
  mesas: [
    { id: 38, group_id: 8, name: 'Mesa 1', icon: 'table_restaurant', color: '#006b3f', sort_order: 1, capacity: 4, table_status: 'free' },
    { id: 39, group_id: 8, name: 'Mesa 2', icon: 'table_restaurant', color: '#006b3f', sort_order: 2, capacity: 4, table_status: 'free' },
    { id: 40, group_id: 8, name: 'Mesa 3', icon: 'table_restaurant', color: '#006b3f', sort_order: 3, capacity: 4, table_status: 'dirty' },
    { id: 41, group_id: 8, name: 'Terraza A', icon: 'deck', color: '#543310', sort_order: 4, capacity: 4, table_status: 'dirty' },
    { id: 42, group_id: 8, name: 'Terraza B', icon: 'deck', color: '#543310', sort_order: 5, capacity: 4, table_status: 'dirty' },
    { id: 43, group_id: 8, name: 'Barra Principal', icon: 'countertops', color: '#0061a4', sort_order: 6, capacity: 6, table_status: 'dirty' },
    { id: 44, group_id: 8, name: 'Sala Privada', icon: 'meeting_room', color: '#9c4221', sort_order: 7, capacity: 8, table_status: 'dirty' },
    { id: 45, group_id: 8, name: 'Area de Estudio', icon: 'desk', color: '#002b26', sort_order: 8, capacity: 4, table_status: 'free' },
  ],
};

const MOCK_GROUPS = [
  { id: 1, name: 'Categorias de Producto', slug: 'categorias_producto', description: 'Clasificacion de productos del menu', icon: 'restaurant', color: '#543310', item_count: 5 },
  { id: 2, name: 'Tipos de Bebida', slug: 'tipos_bebida', description: 'Subcategorias para bebidas', icon: 'local_cafe', color: '#0061a4', item_count: 5 },
  { id: 3, name: 'Tamanos', slug: 'tamanos', description: 'Tamanos disponibles para bebidas y comidas', icon: 'straighten', color: '#006b3f', item_count: 4 },
  { id: 4, name: 'Metodos de Preparacion', slug: 'metodos_preparacion', description: 'Formas de preparar las bebidas', icon: 'science', color: '#9c4221', item_count: 5 },
  { id: 5, name: 'Ingredientes Principales', slug: 'ingredientes_principales', description: 'Base de ingredientes para recetas', icon: 'eco', color: '#002b26', item_count: 6 },
  { id: 8, name: 'Mesas', slug: 'mesas', description: 'Mesas y espacios del salon', icon: 'table_restaurant', color: '#006b3f', item_count: 8 },
];

const EMPTY_ITEM = { name: '', description: '', icon: 'label', color: '', sort_order: 0, price_adjustment: 0, capacity: 4 };

export default function CatalogoDetallePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useApi, setUseApi] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ITEM });
  const [toast, setToast] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const { confirm, confirmModal } = useConfirm();

  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsData, itemsData] = await Promise.all([
        api.getCatalogGroups(),
        api.getCatalogItems(slug)
      ]);
      const found = groupsData.find(g => g.slug === slug);
      if (!found) {
        navigate('/catalogos', { replace: true });
        return;
      }
      setGroup(found);
      setItems(itemsData);
      setUseApi(true);
    } catch {
      const found = MOCK_GROUPS.find(g => g.slug === slug);
      if (!found) {
        navigate('/catalogos', { replace: true });
        return;
      }
      setGroup(found);
      setItems(MOCK_ITEMS[slug] || []);
      setUseApi(false);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditingItem(null);
    setForm({ ...EMPTY_ITEM });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      icon: item.icon || 'label',
      color: item.color || '',
      sort_order: item.sort_order || 0,
      price_adjustment: item.price_adjustment || 0,
      capacity: item.capacity || 4,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    if (useApi) {
      try {
        if (editingItem) {
          await api.updateCatalogItem(editingItem.id, form);
        } else {
          await api.createCatalogItem({ group_id: group.id, ...form });
        }
        const itemsData = await api.getCatalogItems(slug);
        setItems(itemsData);
      } catch (err) {
        showToast(err.error || 'Error al guardar', 'error');
        return;
      }
    } else {
      const updated = [...items];
      if (editingItem) {
        const idx = updated.findIndex(i => i.id === editingItem.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], ...form };
      } else {
        const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
        updated.push({ id: maxId + 1, group_id: group.id, ...form, parent_name: null });
      }
      setItems(updated);
    }

    showToast(editingItem ? 'Item actualizado' : 'Item creado');
    closeModal();
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Desactivar item',
      message: '¿Desactivar este item del catálogo?',
      confirmLabel: 'Desactivar',
      variant: 'danger',
      icon: 'delete',
    });
    if (!ok) return;

    if (useApi) {
      try {
        await api.deleteCatalogItem(id);
        const itemsData = await api.getCatalogItems(slug);
        setItems(itemsData);
      } catch (err) {
        showToast(err.error || 'Error al eliminar', 'error');
        return;
      }
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
    }
    showToast('Item desactivado');
  }

  async function openAssignModal() {
    try { setAllProducts(await api.getProducts()); } catch { setAllProducts([]); }
    setSelectedProductIds([]); setAssignModalOpen(true);
  }

  async function handleSaveAssignment() {
    try {
      for (const productId of selectedProductIds) {
        const current = await api.getProductModifiers(productId);
        const existingGroupIds = [...new Set(current.map(m => m.group_id))];
        if (!existingGroupIds.includes(group.id)) {
          await api.assignProductModifiers(productId, [...existingGroupIds, group.id]);
        }
      }
      setAssignModalOpen(false); showToast('Asignacion guardada');
    } catch (err) { showToast(err.error || 'Error al asignar', 'error'); }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        <span className="text-on-surface-variant mt-2">Cargando...</span>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/catalogos')} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">arrow_back</span>
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: group.color || '#543310' }}>
              <span className="material-symbols-outlined text-white text-[20px]">{group.icon || 'category'}</span>
            </div>
            <div>
              <h1 className="font-display text-lg text-primary font-semibold">{group.name}</h1>
              <span className="text-sm text-on-surface-variant flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
                {items.length} items activos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="btn-primary text-[0.75rem] py-1.5">
              <span className="material-symbols-outlined text-[16px]">add</span> Nuevo Item
            </button>
            {group.is_modifier && (
              <button onClick={openAssignModal} className="btn-ghost text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">link</span> Asignar productos
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Total Items</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{items.length}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Grupo</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1 truncate">{group.name}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Slug</span>
            <div className="font-display text-sm text-on-surface-variant font-mono mt-1">{group.slug}</div>
          </div>
        </div>

        {group.description && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Descripcion</span>
            <p className="text-[0.875rem] text-on-surface mt-1">{group.description}</p>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">No hay items en este grupo. Crea el primero.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">
                  <th className="text-left px-4 py-2.5">Item</th>
                  <th className="text-left px-4 py-2.5">Icono</th>
                  <th className="text-left px-4 py-2.5">Color</th>
                  <th className="text-left px-4 py-2.5">Orden</th>
                  {group?.slug === 'mesas' && <th className="text-left px-4 py-2.5">Cap.</th>}
                  {group?.slug === 'mesas' && <th className="text-left px-4 py-2.5">Estado</th>}
                  {group.is_modifier && <th className="text-right px-4 py-2.5">Ajuste</th>}
                  <th className="text-right px-4 py-2.5">Accion</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[0.8125rem] text-on-surface block">{item.name}</span>
                      {item.description && <span className="text-[0.6875rem] text-on-surface-variant">{item.description}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: item.color || undefined }}>{item.icon || 'label'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.color ? (
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border border-outline-variant/30" style={{ backgroundColor: item.color }}></span>
                          <span className="text-[0.75rem] text-on-surface-variant font-mono">{item.color}</span>
                        </div>
                      ) : (
                        <span className="text-[0.75rem] text-on-surface-variant">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-on-surface-variant">{item.sort_order}</td>
                    {group?.slug === 'mesas' && (
                      <td className="px-4 py-3 text-[0.8125rem] text-on-surface-variant">{item.capacity || 4}</td>
                    )}
                    {group?.slug === 'mesas' && (
                      <td className="px-4 py-3">
                        {item.table_status ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${
                            item.table_status === 'free' ? 'bg-green-100 text-green-700' :
                            item.table_status === 'occupied' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.table_status === 'free' ? 'bg-green-500' :
                              item.table_status === 'occupied' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></span>
                            {item.table_status === 'free' ? 'Libre' : item.table_status === 'occupied' ? 'Ocupada' : 'Sucia'}
                          </span>
                        ) : <span className="text-on-surface-variant">-</span>}
                      </td>
                    )}
                    {group.is_modifier && (
                      <td className="px-4 py-3 text-[0.8125rem] text-right font-semibold">
                        {item.price_adjustment > 0 ? `+$${Number(item.price_adjustment).toFixed(2)}` : item.price_adjustment < 0 ? `-$${Math.abs(Number(item.price_adjustment)).toFixed(2)}` : <span className="text-on-surface-variant">-</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(item)} className="btn-ghost py-1 text-[0.6875rem]">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="btn-ghost py-1 text-[0.6875rem] text-error hover:text-error">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="modal-overlay open" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">
                {editingItem ? 'Editar Item' : 'Nuevo Item'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Nombre del item" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Descripcion</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Descripcion opcional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Icono</label>
                  <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="input-field" placeholder="Nombre del icono" />
                  <span className="text-[0.6875rem] text-on-surface-variant mt-0.5">Material Symbol name</span>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color || '#543310'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer" />
                    <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="input-field flex-1" placeholder="#543310" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Orden</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="input-field" min="0" />
              </div>
              {group?.slug === 'mesas' && (
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Capacidad</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 4 }))} className="input-field" min="1" />
                  <span className="text-[0.6875rem] text-on-surface-variant">Personas por mesa/espacio</span>
                </div>
              )}
              {group.is_modifier && (
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Ajuste de precio</label>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">$</span>
                    <input type="number" step="0.01" value={form.price_adjustment} onChange={e => setForm(f => ({ ...f, price_adjustment: parseFloat(e.target.value) || 0 }))} className="input-field" placeholder="0.00" />
                  </div>
                  <span className="text-[0.6875rem] text-on-surface-variant">Positivo = mas caro, negativo = mas barato</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSave} className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span>
                {editingItem ? 'Guardar Cambios' : 'Crear Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] z-50 transition-transform duration-300 ${
          toast.type === 'error' ? 'bg-error text-white' : 'bg-tertiary text-white'
        }`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {assignModalOpen && (
        <div className="modal-overlay open" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">Asignar productos al grupo</h2>
              <button onClick={() => setAssignModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-3">Selecciona los productos que tendran este grupo de modificadores:</p>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
              {allProducts.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => setSelectedProductIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className="w-4 h-4 accent-primary-container" />
                  <span className="text-sm text-on-surface">{p.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAssignModalOpen(false)} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSaveAssignment} className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
