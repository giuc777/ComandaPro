import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';

export default function ModifierModal({ productId, productName, basePrice, onConfirm, onClose }) {
  const [groups, setGroups] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModifiers() {
      setLoading(true);
      try {
        const data = await api.getProductModifiers(productId);
        const grouped = {};
        data.forEach(row => {
          if (!grouped[row.group_id]) {
            grouped[row.group_id] = {
              group_id: row.group_id,
              group_name: row.group_name,
              required: row.required,
              max_selections: row.max_selections,
              options: []
            };
          }
          if (row.option_id) {
            grouped[row.group_id].options.push({
              id: row.option_id,
              name: row.option_name,
              price_adjustment: row.price_adjustment
            });
          }
        });
        setGroups(Object.values(grouped));

        const initialSelections = {};
        Object.values(grouped).forEach(g => {
          initialSelections[g.group_id] = [];
        });
        setSelections(initialSelections);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }
    loadModifiers();
  }, [productId]);

  function toggleOption(groupId, optionId) {
    const group = groups.find(g => g.group_id === groupId);
    if (!group) return;

    setSelections(prev => {
      const current = prev[groupId] || [];
      const isMulti = group.max_selections > 1;

      if (isMulti) {
        const exists = current.includes(optionId);
        if (exists) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) };
        }
        if (current.length < group.max_selections) {
          return { ...prev, [groupId]: [...current, optionId] };
        }
        return prev;
      } else {
        const exists = current.includes(optionId);
        return { ...prev, [groupId]: exists ? [] : [optionId] };
      }
    });
  }

  function calculateTotal() {
    let total = basePrice;
    Object.values(selections).flat().forEach(optionId => {
      groups.forEach(g => {
        const opt = g.options.find(o => o.id === optionId);
        if (opt) total += opt.price_adjustment;
      });
    });
    return total;
  }

  function handleConfirm() {
    const allModifiers = Object.values(selections).flat();
    onConfirm(allModifiers, calculateTotal());
  }

  if (loading) {
    return (
      <div className="modal-overlay open" onClick={onClose}>
        <div className="modal-content w-full max-w-md flex items-center justify-center py-12" onClick={e => e.stopPropagation()}>
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-content w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg text-on-surface font-semibold">{productName}</h2>
            <span className="text-sm text-on-surface-variant">Personaliza tu orden</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto mb-4">
          {groups.map(group => (
            <ModifierGroupComp
              key={group.group_id}
              group={group}
              selected={selections[group.group_id] || []}
              onToggle={(optionId) => toggleOption(group.group_id, optionId)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15">
          <span className="font-semibold text-on-surface">Total</span>
          <span className="font-display text-lg font-bold text-primary">Q{calculateTotal().toFixed(2)}</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost flex-1 text-[0.75rem] py-1.5">Cancelar</button>
          <button onClick={handleConfirm} className="btn-primary flex-1 text-[0.75rem] py-1.5">
            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifierGroupComp({ group, selected, onToggle }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm text-on-surface">{group.group_name}</span>
        {group.required && <span className="text-[0.625rem] text-tertiary font-bold uppercase">Requerido</span>}
        <span className="text-[0.625rem] text-on-surface-variant ml-auto">
          {group.max_selections > 1 ? `Max ${group.max_selections}` : 'Opcion unica'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.options.map(opt => (
          <ModifierChipComp
            key={opt.id}
            option={opt}
            isSelected={selected.includes(opt.id)}
            onClick={() => onToggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ModifierChipComp({ option, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition-all ${isSelected ? 'active' : ''}`}
    >
      <span>{option.name}</span>
      {option.price_adjustment !== 0 && (
        <span className="text-[0.6875rem] font-bold">
          {option.price_adjustment > 0 ? '+' : ''}Q{option.price_adjustment.toFixed(2)}
        </span>
      )}
    </button>
  );
}