import { useState, useEffect, useRef } from 'react';

export default function TableSelector({ tables, selectedId, onSelect, onClose, positionRef }) {
    const [open, setOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        function handleEsc() { if (open) setOpen(false); }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEsc);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEsc);
            };
        }
    }, [open]);

    function handleToggle() {
        if (open) { setOpen(false); return; }
        if (positionRef?.current) {
            const rect = positionRef.current.getBoundingClientRect();
            setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        }
        setOpen(true);
    }

    function handleSelect(table) {
        onSelect(table);
        setOpen(false);
    }

    const selected = tables.find(t => t.id === selectedId);

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={handleToggle}
                className={`btn-secondary text-[0.75rem] py-1.5 flex items-center gap-1.5 ${open ? 'ring-2 ring-primary' : ''}`}
                data-testid="table-selector"
            >
                <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                {selected ? selected.name : 'Seleccionar mesa'}
            </button>

            {open && (
                <div
                    className="fixed z-50 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg w-56 max-h-72 overflow-y-auto"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {tables.map(table => (
                        <button
                            key={table.id}
                            onClick={() => handleSelect(table)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface-container transition-colors ${selectedId === table.id ? 'bg-primary-container/10' : ''}`}
                            data-testid={`table-option-${table.id}`}
                        >
                            <span className="text-sm font-medium text-on-surface">{table.name}</span>
                            <span className="text-[0.6875rem] text-on-surface-variant">{table.capacity} pers.</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
