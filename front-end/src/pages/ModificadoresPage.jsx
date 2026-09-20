import { useState, useEffect } from 'react';
import { api } from '../api/apiClient';

const EMPTY_GROUP = { name: '', required: false, max_selections: 1, display_order: 0 };
const EMPTY_OPTION = { name: '', price_adjustment: 0, display_order: 0 };

export default function ModificadoresPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ ...EMPTY_GROUP });

  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [options, setOptions] = useState([]);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm, setOptionForm] = useState({ ...EMPTY_OPTION });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignGroupId, setAssignGroupId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const totalOptions = groups.reduce((s, g) => s + (g.option_count || 0), 0);

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    setLoading(true);
    try { setGroups(await api.getModifierGroups()); } catch { setGroups([]); } finally { setLoading(false); }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000);
  }

  function openCreateGroup() { setEditingGroup(null); setGroupForm({ ...EMPTY_GROUP }); setGroupModalOpen(true); }
  function openEditGroup(e, group) {
    e.stopPropagation(); setEditingGroup(group);
    setGroupForm({ name: group.name || '', required: group.required || false, max_selections: group.max_selections || 1, display_order: group.display_order || 0 });
    setGroupModalOpen(true);
  }

  async function handleSaveGroup() {
    if (!groupForm.name.trim()) { showToast('El nombre es requerido', 'error'); return; }
    try {
      if (editingGroup) { await api.updateModifierGroup(editingGroup.id, { ...groupForm, active: true }); }
      else { await api.createModifierGroup(groupForm); }
      await loadGroups(); showToast(editingGroup ? 'Grupo actualizado' : 'Grupo creado'); setGroupModalOpen(false);
    } catch (err) { showToast(err.error || 'Error al guardar', 'error'); }
  }

  async function handleDeleteGroup(id) {
    if (!confirm('Eliminar este grupo y todas sus opciones?')) return;
    try { await api.deleteModifierGroup(id); await loadGroups(); showToast('Grupo eliminado'); }
    catch (err) { showToast(err.error || 'Error al eliminar', 'error'); }
  }

  async function openOptionsModal(group) {
    setSelectedGroup(group);
    try { setOptions(await api.getModifierOptions(group.id)); } catch { setOptions([]); }
    setOptionsModalOpen(true);
  }

  function openCreateOption() { setEditingOption(null); setOptionForm({ ...EMPTY_OPTION }); setOptionModalOpen(true); }
  function openEditOption(opt) {
    setEditingOption(opt);
    setOptionForm({ name: opt.name || '', price_adjustment: opt.price_adjustment || 0, display_order: opt.display_order || 0 });
    setOptionModalOpen(true);
  }

  async function handleSaveOption() {
    if (!optionForm.name.trim()) { showToast('El nombre es requerido', 'error'); return; }
    try {
      if (editingOption) { await api.updateModifierOption(editingOption.id, { ...optionForm, active: true }); }
      else { await api.createModifierOption({ ...optionForm, group_id: selectedGroup.id }); }
      setOptions(await api.getModifierOptions(selectedGroup.id)); await loadGroups();
      showToast(editingOption ? 'Opcion actualizada' : 'Opcion creada'); setOptionModalOpen(false);
    } catch (err) { showToast(err.error || 'Error al guardar', 'error'); }
  }

  async function handleDeleteOption(id) {
    if (!confirm('Eliminar esta opcion?')) return;
    try { await api.deleteModifierOption(id); setOptions(await api.getModifierOptions(selectedGroup.id)); await loadGroups(); showToast('Opcion eliminada'); }
    catch (err) { showToast(err.error || 'Error al eliminar', 'error'); }
  }

  async function openAssignModal(groupId) {
    setAssignGroupId(groupId);
    try { setAllProducts(await api.getProducts()); } catch { setAllProducts([]); }
    setSelectedProductIds([]); setAssignModalOpen(true);
  }

  async function handleSaveAssignment() {
    try {
      for (const productId of selectedProductIds) {
        const current = await api.getProductModifiers(productId);
        const existingGroupIds = [...new Set(current.map(m => m.group_id))];
        if (!existingGroupIds.includes(assignGroupId)) {
          await api.assignProductModifiers(productId, [...existingGroupIds, assignGroupId]);
        }
      }
      setAssignModalOpen(false); showToast('Asignacion guardada');
    } catch (err) { showToast(err.error || 'Error al asignar', 'error'); }
  }

  const groupIcon = (name) => {
    if (name.includes('Leche')) return 'water_drop';
    if (name.includes('Taman')) return 'straighten';
    if (name.includes('Temper')) return 'thermostat';
    return 'add_circle';
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Modificadores</h1>
            <span className="text-sm text-on-surface-variant flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
              {groups.length} grupos · {totalOptions} opciones
            </span>
          </div>
          <button onClick={openCreateGroup} className="btn-primary text-[0.75rem] py-1.5">
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
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Opciones</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{totalOptions}</div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Seleccion</span>
            <div className="font-display text-sm text-on-surface-variant font-bold mt-1">Radio / Check</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">tune</span>
            <p className="text-on-surface-variant mt-2">No hay grupos de modificadores. Crea el primero.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map(group => (
              <div key={group.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-primary text-[20px]">{groupIcon(group.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-display text-[0.9375rem] text-on-surface font-semibold">{group.name}</h3>
                      <div className="flex items-center gap-2 text-[0.75rem] text-on-surface-variant">
                        <span>{group.option_count || 0} opciones</span>
                        <span>·</span>
                        <span>Max {group.max_selections}</span>
                        {group.required && <><span>·</span><span className="text-tertiary font-semibold">Requerido</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => openEditGroup(e, group)} className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 rounded-full hover:bg-error-container transition-colors" title="Eliminar">
                      <span className="material-symbols-outlined text-error text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openOptionsModal(group)} className="btn-secondary text-[0.6875rem] py-1.5 flex-1">
                    <span className="material-symbols-outlined text-[14px]">list</span> Ver Opciones
                  </button>
                  <button onClick={() => openAssignModal(group.id)} className="btn-ghost text-[0.6875rem] py-1.5">
                    <span className="material-symbols-outlined text-[14px]">link</span> Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {groupModalOpen && (
        <div className="modal-overlay open" onClick={() => setGroupModalOpen(false)}>
          <div className="modal-content w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
              <button onClick={() => setGroupModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Nombre</label>
                <input type="text" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Ej: Tipo de Leche" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Max selecciones</label>
                  <input type="number" min="1" max="10" value={groupForm.max_selections} onChange={e => setGroupForm(f => ({ ...f, max_selections: Number(e.target.value) }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Orden</label>
                  <input type="number" min="0" value={groupForm.display_order} onChange={e => setGroupForm(f => ({ ...f, display_order: Number(e.target.value) }))} className="input-field" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="group-required" checked={groupForm.required} onChange={e => setGroupForm(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 accent-primary-container" />
                <label htmlFor="group-required" className="text-sm text-on-surface-variant">Requerido para el producto</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setGroupModalOpen(false)} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSaveGroup} className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span> {editingGroup ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {optionsModalOpen && selectedGroup && (
        <div className="modal-overlay open" onClick={() => setOptionsModalOpen(false)}>
          <div className="modal-content w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg text-on-surface font-semibold">{selectedGroup.name}</h2>
                <span className="text-xs text-on-surface-variant">{options.length} opciones</span>
              </div>
              <button onClick={() => setOptionsModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-4 max-h-[50vh] overflow-y-auto">
              {options.length === 0 ? (
                <p className="text-on-surface-variant text-sm text-center py-4">No hay opciones</p>
              ) : options.map(opt => (
                <div key={opt.id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-on-surface">{opt.name}</span>
                    {opt.price_adjustment !== 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.price_adjustment > 0 ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-error'}`}>
                        {opt.price_adjustment > 0 ? '+' : ''}Q{opt.price_adjustment.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditOption(opt)} className="p-1 rounded-full hover:bg-surface-container-high">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteOption(opt.id)} className="p-1 rounded-full hover:bg-error-container">
                      <span className="material-symbols-outlined text-error text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={openCreateOption} className="btn-secondary w-full text-[0.75rem] py-1.5">
              <span className="material-symbols-outlined text-[16px]">add</span> Agregar Opcion
            </button>
          </div>
        </div>
      )}

      {optionModalOpen && (
        <div className="modal-overlay open" onClick={() => setOptionModalOpen(false)}>
          <div className="modal-content w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">{editingOption ? 'Editar Opcion' : 'Nueva Opcion'}</h2>
              <button onClick={() => setOptionModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Nombre</label>
                <input type="text" value={optionForm.name} onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Ej: Avena" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Ajuste de precio (Q)</label>
                  <input type="number" step="0.50" value={optionForm.price_adjustment} onChange={e => setOptionForm(f => ({ ...f, price_adjustment: Number(e.target.value) }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">Orden</label>
                  <input type="number" min="0" value={optionForm.display_order} onChange={e => setOptionForm(f => ({ ...f, display_order: Number(e.target.value) }))} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOptionModalOpen(false)} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSaveOption} className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span> {editingOption ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div className="modal-overlay open" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-content w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-on-surface font-semibold">Asignar productos al grupo</h2>
              <button onClick={() => setAssignModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-3">Selecciona los productos que tendran este grupo de modificadores.</p>
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mb-4">
              {allProducts.map(p => (
                <label key={p.id} className="flex items-center gap-3 bg-surface-container-low rounded-xl px-3 py-2.5 cursor-pointer hover:bg-surface-container-high transition-colors">
                  <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={e => {
                    setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id));
                  }} className="w-4 h-4 accent-primary-container" />
                  <span className="font-semibold text-sm text-on-surface">{p.name}</span>
                  <span className="text-xs text-on-surface-variant ml-auto">Q{Number(p.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignModalOpen(false)} className="btn-ghost text-[0.75rem] py-1.5">Cancelar</button>
              <button onClick={handleSaveAssignment} className="btn-primary text-[0.75rem] py-1.5" disabled={selectedProductIds.length === 0}>
                <span className="material-symbols-outlined text-[16px]">save</span> Asignar ({selectedProductIds.length})
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