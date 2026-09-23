import { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import TransactionsList from './TransactionsList';
import TransactionDetailModal from './TransactionDetailModal';

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

export default function ShiftTransactionsModal({ shift, onClose }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        const handleKey = e => { if (e.key === 'Escape' && !selectedTx) onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, selectedTx]);

    useEffect(() => {
        if (!shift) return;
        api.getShiftTransactions(shift.id)
            .then(data => {
                if (data.error) throw new Error(data.error);
                setTransactions(Array.isArray(data) ? data : []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [shift]);

    if (!shift) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                <div
                    className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="bg-surface-container-low p-4 border-b border-outline-variant/20 flex items-start justify-between gap-3 flex-shrink-0">
                        <div>
                            <h2 className="font-display text-lg text-primary font-semibold">Turno #{shift.id}</h2>
                            <p className="text-sm text-on-surface-variant">
                                {shift.cashier_name} &middot; {formatDateTime(shift.close_time || shift.start_time)}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-1">
                                {shift.transaction_count || 0} transacciones &middot; {formatCurrency(shift.total_sales)}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-on-surface-variant">close</span>
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto">
                        {error ? (
                            <p className="text-error text-sm text-center py-6">{error}</p>
                        ) : (
                            <TransactionsList
                                transactions={transactions}
                                loading={loading}
                                onSelect={setSelectedTx}
                            />
                        )}
                    </div>
                </div>
            </div>

            {selectedTx && (
                <TransactionDetailModal
                    transaction={selectedTx}
                    onClose={() => setSelectedTx(null)}
                />
            )}
        </>
    );
}