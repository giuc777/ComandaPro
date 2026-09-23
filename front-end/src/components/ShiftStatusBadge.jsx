export default function ShiftStatusBadge({ shift, onClick }) {
    if (!shift) {
        return (
            <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold flex items-center gap-1 bg-surface-container text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                Sin Turno
            </span>
        );
    }

    return (
        <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold flex items-center gap-1 bg-tertiary/10 text-tertiary hover:bg-tertiary/20 transition-colors cursor-pointer"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
            Turno #{shift.id} Abierto
        </button>
    );
}
