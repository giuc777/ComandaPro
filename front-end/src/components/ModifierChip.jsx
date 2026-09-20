export default function ModifierChip({ option, isSelected, onClick }) {
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