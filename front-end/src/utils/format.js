export function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

export function formatCompactCurrency(amount) {
    const value = Number(amount || 0);
    if (Math.abs(value) >= 1000) {
        return `Q ${(value / 1000).toFixed(1)}k`;
    }
    return `Q ${value.toFixed(0)}`;
}

export function formatPercent(value, withSign = true) {
    const n = Number(value || 0);
    const sign = withSign && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
}

export function formatHour(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
}

export function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
}
