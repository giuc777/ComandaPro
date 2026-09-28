const STATUS_STYLES = {
    enviada: { label: 'Recibido', className: 'bg-primary-container/20 text-primary' },
    preparando: { label: 'En Preparacion', className: 'bg-secondary-container/40 text-on-secondary-container' },
    lista: { label: 'Listo', className: 'bg-tertiary/15 text-tertiary' },
    completada: { label: 'Completada', className: 'bg-surface-container text-on-surface-variant' },
};

export default function KdsStatusBadge({ status }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES.enviada;

    return (
        <span
            className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${style.className}`}
            data-testid={`kds-status-${status}`}
        >
            {style.label}
        </span>
    );
}
