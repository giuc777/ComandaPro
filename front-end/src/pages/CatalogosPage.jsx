import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';

const MOCK_GROUPS = [
  { id: 1, name: 'Categorias de Producto', slug: 'categorias_producto', description: 'Clasificacion de productos del menu', icon: 'restaurant', color: '#543310', item_count: 5, sort_order: 1 },
  { id: 2, name: 'Tipos de Bebida', slug: 'tipos_bebida', description: 'Subcategorias para bebidas', icon: 'local_cafe', color: '#0061a4', item_count: 5, sort_order: 2 },
  { id: 3, name: 'Tamanos', slug: 'tamanos', description: 'Tamanos disponibles para bebidas y comidas', icon: 'straighten', color: '#006b3f', item_count: 4, sort_order: 3 },
  { id: 4, name: 'Metodos de Preparacion', slug: 'metodos_preparacion', description: 'Formas de preparar las bebidas', icon: 'science', color: '#9c4221', item_count: 5, sort_order: 4 },
  { id: 5, name: 'Ingredientes Principales', slug: 'ingredientes_principales', description: 'Base de ingredientes para recetas', icon: 'eco', color: '#002b26', item_count: 6, sort_order: 5 },
  { id: 8, name: 'Mesas', slug: 'mesas', description: 'Mesas y espacios del salon', icon: 'table_restaurant', color: '#006b3f', item_count: 8, sort_order: 6 },
];

const EMPTY_GROUP = { name: '', slug: '', description: '', icon: 'category', color: '#543310', sort_order: 0, is_modifier: false, required: false, max_selections: 1 };

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function CatalogosPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_GROUP });
  const [toast, setToast] = useState(null);

  const totalItems = groups.reduce((s, g) => s + (g.item_count || 0), 0);

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await api.getCatalogGroups();
      setGroups(data);
      setUseApi(true);
    } catch {
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
    setEditingGroup(null);
    setForm({ ...EMPTY_GROUP });
    setModalOpen(true);
  }

  function openEdit(e, group) {
    e.stopPropagation();
    setEditingGroup(group);
    setForm({
      name: group.name || '', slug: group.slug || '',
      description: group.description || '', icon: group.icon || 'category',
      color: group.color || '#543310', sort_order: group.sort_order || 0,
      is_modifier: group.is_modifier || false, required: group.required || false,
      max_selections: group.max_selections || 1,
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingGroup(null); }

  async function handleSave() {
    if (!form.name.trim()) { showToast('El nombre es requerido', 'error'); return; }
    const slug = form.slug || slugify(form.name);
    if (useApi) {
      try {
        if (editingGroup) {
          await api.updateCatalogGroup(editingGroup.id, { ...form, active: true });
        } else {
          await api.createCatalogGroup({ ...form, slug });
        }
        const data = await api.getCatalogGroups();
        setGroups(data);
      } catch (err) { showToast(err.error || 'Error al guardar', 'error'); return; }
    } else {
      if (editingGroup) {
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, ...form, slug } : g));
      } else {
        const maxId = groups.reduce((m, g) => Math.max(m, g.id), 0);
        setGroups(prev => [...prev, { id: maxId + 1, ...form, slug, item_count: 0 }]);
      }
    }
    showToast(editingGroup ? 'Grupo actualizado' : 'Grupo creado');
    closeModal();
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Catalogos</h1>
            <span className="text-sm text-on-surface-variant flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
              {groups.length} grupos activos
            </span>
          </div>
          <button onClick={openCreate} className="btn-primary text-[0.75rem] py-1.5">
            <span className="material-symbols-outlined text-[16px]">add</span> Nuevo Grupo
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Grupos</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{groups.length}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Total Items</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{totalItems}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Ultima edicion</span>
            <div className="font-display text-sm text-on-surface-variant font-bold mt-1">Hoy</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">folder_open</span>
            <p className="text-on-surface-variant mt-2">No hay grupos de catalogo. Crea el primero.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => navigate(`/catalogos/${group.slug}`)}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 cursor-pointer hover:shadow-md hover:border-primary-container/40 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: group.color || '#543310' }}>
                    <span className="material-symbols-outlined text-white text-[24px]">{group.icon || 'category'}</span>
                  </div>
                  <button onClick={(e) => openEdit(e, group)} className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-surface-container-high transition-all">
                    <span className="material-symbols-outlined text-on-surface-variant text-[16px]">edit</span>
                  </button>
                </div>
                <h3 className="font-display text-[0.9375rem] text-on-surface font-semibold mb-1">
                  {group.name}
                  {group.is_modifier && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[0.625rem] font-bold uppercase">Modificador</span>
                  )}
                </h3>
                <p className="text-[0.75rem] text-on-surface-variant line-clamp-2 mb-3">{group.description || 'Sin descripcion'}</p>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">inventory_2</span>
                    <span className="text-[0.75rem] font-semibold text-on-surface">{group.item_count || 0} items</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[0.6875rem] font-semibold">Ver</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="modal-overlay open" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} className="input-field" placeholder="Ej: Menu Cafe" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Slug</label>
                <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input-field font-mono" placeholder="menu_cafe" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="group-modifier" checked={form.is_modifier} onChange={e => setForm(f => ({ ...f, is_modifier: e.target.checked }))} className="w-4 h-4 accent-primary-container" />
                <label htmlFor="group-modifier" className="text-sm text-on-surface-variant font-semibold">Grupo de modificadores (POS)</label>
              </div>
              {form.is_modifier && (
                <div className="grid grid-cols-2 gap-3 bg-surface-container-low rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="group-required" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 accent-primary-container" />
                    <label htmlFor="group-required" className="text-sm text-on-surface-variant">Requerido</label>
                  </div>
                  <div>
                    <label className="block text-xs text-on-surface-variant mb-1 font-semibold">Max selecciones</label>
                    <input type="number" min="1" max="10" value={form.max_selections} onChange={e => setForm(f => ({ ...f, max_selections: Number(e.target.value) }))} className="input-field" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Descripcion</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Descripcion del grupo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Icono</label>
                  <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="input-field" placeholder="category" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color || '#543310'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer" />
                    <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="input-field flex-1" placeholder="#543310" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeModal} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSave} className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span>
                {editingGroup ? 'Guardar' : 'Crear Grupo'}
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
    </div>
  );
}
