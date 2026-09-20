import ModifierChip from './ModifierChip';

export default function ModifierGroup({ group, selected, onToggle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm text-on-surface">{group.group_name}</span>
        {group.required && (
          <span className="text-[0.625rem] text-tertiary font-bold uppercase">Requerido</span>
        )}
        <span className="text-[0.625rem] text-on-surface-variant ml-auto">
          {group.max_selections > 1 ? `Max ${group.max_selections}` : 'Opcion unica'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.options.map(opt => (
          <ModifierChip
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