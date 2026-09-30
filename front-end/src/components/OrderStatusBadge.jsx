const STATUS_STYLES = {
    borrador: { label: 'Borrador', className: 'bg-surface-container text-on-surface-variant' },
    pausada: { label: 'Pausada', className: 'bg-surface-container-high text-on-surface' },
    enviada: { label: 'En cocina', className: 'bg-primary-container/20 text-primary', pulse: true },
    preparando: { label: 'Preparando', className: 'bg-secondary-container/40 text-on-secondary-container', pulse: true },
    lista: { label: 'Listo para cobrar', className: 'bg-tertiary/15 text-tertiary' },
    completada: { label: 'Completada', className: 'bg-tertiary/15 text-tertiary' },
    pagada: { label: 'Pagada', className: 'bg-primary-container/20 text-primary' },
    anulada: { label: 'Anulada', className: 'bg-error-container/40 text-on-error-container' },
};

export default function OrderStatusBadge({ status }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES.borrador;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${style.className} ${
                style.pulse ? 'animate-pulse' : ''
            }`}
            data-testid={`order-status-${status || 'borrador'}`}
        >
            {style.label}
        </span>
    );
}
