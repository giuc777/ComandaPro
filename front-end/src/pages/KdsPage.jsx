import { useNavigate } from 'react-router-dom';

export default function KdsPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">coffee_maker</span>
                        <div>
                            <h1 className="font-display text-lg text-primary font-semibold">KDS Cocina</h1>
                            <div className="flex items-center gap-2 text-[0.6875rem]">
                                <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
                                    Próximamente
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 flex items-center justify-center">
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-8 max-w-md text-center">
                    <span className="material-symbols-outlined text-[56px] text-on-surface-variant mb-3 block">
                        coffee_maker
                    </span>
                    <h2 className="font-display text-lg text-on-surface font-semibold mb-2">
                        Kitchen Display System
                    </h2>
                    <p className="text-sm text-on-surface-variant mb-4">
                        El módulo de cocina (KDS) aún no está implementado. Mientras tanto,
                        las órdenes se <strong className="text-on-surface">pausan</strong> en el POS
                        con status <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded">pausada</code>
                        y se listan para su identificación y cobro.
                    </p>
                    <button
                        onClick={() => navigate('/pos')}
                        className="btn-primary text-[0.75rem] py-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">point_of_sale</span> Ir al POS
                    </button>
                </div>
            </main>
        </div>
    );
}
