import { useNavigate } from 'react-router-dom';

const MOCK_KDS_ORDERS = [
  { id: 1045, table: 4, customer: 'Ana G.', status: 'preparing', items: [{ name: 'Latte Vainilla', qty: 1, mods: 'Vainilla, Avena' }, { name: 'Espresso Doble', qty: 2 }, { name: 'Croissant Almendra', qty: 1 }], createdAt: new Date(Date.now() - 12 * 60000).toISOString(), elapsed: 12 },
  { id: 1046, table: 7, customer: 'Pedro M.', status: 'received', items: [{ name: 'Capuchino', qty: 2, mods: 'Entera' }, { name: 'Te Chai', qty: 1, mods: 'Sin azucar' }], createdAt: new Date(Date.now() - 5 * 60000).toISOString(), elapsed: 5 },
  { id: 1048, table: 5, customer: 'Mesa 5', status: 'preparing', items: [{ name: 'V60 Origen', qty: 1 }, { name: 'Flat White', qty: 2 }, { name: 'Croissant Mantequilla', qty: 2 }, { name: 'Moka Clasico', qty: 1 }], createdAt: new Date(Date.now() - 18 * 60000).toISOString(), elapsed: 18 },
];

const STATUS_COLORS = {
  received: 'bg-primary-container text-on-primary-container',
  preparing: 'bg-secondary-container text-on-secondary-container',
  ready: 'bg-tertiary text-white',
};

const STATUS_LABELS = {
  received: 'Recibido',
  preparing: 'En Preparacion',
  ready: 'Listo',
};

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'Ahora';
  return `${diff} min`;
}

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
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary pulse-dot"></span>
                  {MOCK_KDS_ORDERS.length} pendientes
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver
          </button>
        </div>

        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-outline-variant/10">
          <button className="chip active">Todos <span className="badge bg-primary-container/20 text-primary ml-1">{MOCK_KDS_ORDERS.length}</span></button>
          <button className="chip">Recibidos</button>
          <button className="chip">En Preparacion</button>
          <button className="chip">Listos</button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 md:pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
        {MOCK_KDS_ORDERS.map((order) => (
          <div key={order.id} className={`kds-card rounded-2xl border p-4 ${
            order.status === 'preparing' ? 'border-secondary/30 bg-secondary-container/5' :
            order.status === 'received' ? 'border-primary/20 bg-primary-container/5' :
            'border-tertiary/20 bg-tertiary/5'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`font-display text-lg font-bold ${order.status === 'ready' ? 'text-tertiary' : 'text-primary'}`}>#{order.id}</span>
                <span className="text-xs text-on-surface-variant">{order.table ? `Mesa ${order.table}` : 'Llevar'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <span className="text-xs text-on-surface-variant block mb-2">{order.customer} &bull; {timeAgo(order.createdAt)}</span>
            <div className="flex flex-col gap-1.5 mb-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-on-surface">{item.qty}x {item.name}</span>
                  {item.mods && <span className="text-[0.625rem] text-secondary">{item.mods}</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {order.status === 'received' && (
                <button className="btn-primary flex-1 text-[0.6875rem] py-1.5 min-h-[32px]">
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span> Preparar
                </button>
              )}
              {order.status === 'preparing' && (
                <button className="btn-primary flex-1 text-[0.6875rem] py-1.5 min-h-[32px] bg-tertiary">
                  <span className="material-symbols-outlined text-[14px]">check</span> Listo
                </button>
              )}
              {order.status === 'ready' && (
                <button className="btn-primary flex-1 text-[0.6875rem] py-1.5 min-h-[32px] bg-surface-container-high text-on-surface">
                  <span className="material-symbols-outlined text-[14px]">delivery_dining</span> Entregar
                </button>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
