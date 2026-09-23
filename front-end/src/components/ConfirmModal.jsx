import { useEffect } from 'react';

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'primary',
    icon,
    onConfirm,
    onCancel,
}) {
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel?.();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onCancel]);

    if (!open) return null;

    const danger = variant === 'danger';
    const iconName = icon || (danger ? 'warning' : 'help');

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col items-center text-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-error-container/40' : 'bg-primary/10'}`}>
                        <span className={`material-symbols-outlined text-[26px] ${danger ? 'text-error' : 'text-primary'}`}>
                            {iconName}
                        </span>
                    </div>
                    {title && (
                        <h2 className="font-display text-lg text-on-surface font-semibold">{title}</h2>
                    )}
                    {message && (
                        <p className="text-sm text-on-surface-variant">{message}</p>
                    )}
                </div>
                <div className="p-4 pt-0 flex gap-3">
                    <button onClick={onCancel} className="btn-secondary flex-1 justify-center">
                        {cancelLabel}
                    </button>
                    <button onClick={onConfirm} className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1 justify-center`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
