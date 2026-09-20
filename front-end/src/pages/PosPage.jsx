import { useNavigate } from 'react-router-dom';

export default function PosPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold">Volver</span>
                <span className="text-[0.625rem] text-on-surface-variant">Dashboard</span>
              </div>
            </button>
            <div className="h-8 w-px bg-outline-variant hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-secondary font-bold">Orden</span>
              <span className="font-display text-lg text-primary">#1049</span>
              <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-lg text-[0.6875rem] font-semibold">
                {new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-3 block">point_of_sale</span>
          <h2 className="font-display text-lg text-on-surface font-semibold mb-2">Punto de Venta</h2>
          <p className="text-sm text-on-surface-variant mb-4">Modulo de ventas POS en desarrollo</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary">
              <span className="material-symbols-outlined text-[16px]">restaurant</span> En Mesa
            </button>
            <button className="btn-secondary">
              <span className="material-symbols-outlined text-[16px]">local_mall</span> Para Llevar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['Cafe Caliente', 'Frios', 'Pasteleria', 'Tes', 'Granos & Retail'].map((cat) => (
            <button key={cat} className="chip justify-center">{cat}</button>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-on-surface">Ticket Actual</span>
            <span className="text-xs text-on-surface-variant">0 items</span>
          </div>
          <p className="text-on-surface-variant text-sm py-4 text-center">Agrega productos para comenzar</p>
          <div className="divider"></div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-semibold text-sm text-on-surface">Subtotal</span>
            <span className="font-display text-sm font-bold">Q 0.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-on-surface-variant">IVA (12%)</span>
            <span className="text-xs text-on-surface-variant">Q 0.00</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/15">
            <span className="font-semibold text-on-surface">Total</span>
            <span className="font-display text-lg font-bold text-primary">Q 0.00</span>
          </div>
          <button className="btn-primary w-full mt-4" disabled>
            <span className="material-symbols-outlined text-[16px]">send</span> Enviar a Cocina
          </button>
        </div>
      </main>
    </div>
  );
}
