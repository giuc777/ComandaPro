import { useNavigate } from 'react-router-dom';

export default function CajaPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Caja</h1>
            <span className="text-sm text-on-surface-variant">Ana Lopez &bull; Estacion 01</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold flex items-center gap-1 bg-surface-container text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            Turno Cerrado
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[18px]">payments</span>
              </span>
              <span className="text-xs text-on-surface-variant font-semibold">Efectivo</span>
            </div>
            <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]">credit_card</span>
              </span>
              <span className="text-xs text-on-surface-variant font-semibold">Tarjeta</span>
            </div>
            <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[18px]">qr_code</span>
              </span>
              <span className="text-xs text-on-surface-variant font-semibold">QR</span>
            </div>
            <span className="font-display text-lg text-on-surface font-bold">Q 0.00</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-4">Abrir Turno</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Efectivo Inicial</label>
              <input type="number" className="input-field" placeholder="Q 0.00" defaultValue="500" />
            </div>
            <button className="btn-primary self-start">
              <span className="material-symbols-outlined text-[16px]">lock_open</span> Abrir Caja
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Ultimos Movimientos</h3>
          <p className="text-on-surface-variant text-sm py-4 text-center">No hay movimientos hoy</p>
        </div>

        <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full justify-center">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al Dashboard
        </button>
      </main>
    </div>
  );
}
