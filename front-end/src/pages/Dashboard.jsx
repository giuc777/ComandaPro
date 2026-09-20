import { useNavigate } from 'react-router-dom';

const MOCK_ORDERS = [
  { id: 1045, table: 4, customer: 'Ana G.', status: 'preparing', items: [{ name: 'Latte Vainilla', qty: 1 }, { name: 'Espresso Doble', qty: 2 }, { name: 'Croissant Almendra', qty: 1 }], createdAt: new Date(Date.now() - 12 * 60000).toISOString(), total: 86 },
  { id: 1046, table: 7, customer: 'Pedro M.', status: 'received', items: [{ name: 'Capuchino', qty: 2 }, { name: 'Te Chai', qty: 1 }], createdAt: new Date(Date.now() - 5 * 60000).toISOString(), total: 70 },
  { id: 1047, table: null, customer: 'Lucia', status: 'ready', items: [{ name: 'Cold Brew Nitro', qty: 1 }, { name: 'Matcha Latte', qty: 1 }], createdAt: new Date(Date.now() - 25 * 60000).toISOString(), total: 66 },
  { id: 1048, table: 5, customer: 'Mesa 5', status: 'preparing', items: [{ name: 'V60 Origen', qty: 1 }, { name: 'Flat White', qty: 2 }, { name: 'Croissant Mantequilla', qty: 2 }], createdAt: new Date(Date.now() - 18 * 60000).toISOString(), total: 119 },
];

const STATUS_COLORS = {
  received: 'bg-primary-container text-on-primary-container',
  preparing: 'bg-secondary-container text-on-secondary-container',
  ready: 'bg-tertiary text-white',
  completed: 'bg-surface-container-high text-on-surface-variant',
};

const STATUS_LABELS = {
  received: 'Recibido',
  preparing: 'En Preparacion',
  ready: 'Listo',
  completed: 'Completado',
};

function formatCurrency(amount) {
  return `Q ${amount.toFixed(2)}`;
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff === 1) return '1 min';
  return `${diff} min`;
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const greeting = new Date().getHours() < 12 ? 'Buenos dias' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  const name = user?.name?.split(' ')[0] || 'Barista';

  const dailySales = 1285.50;
  const dailyOrders = 24;
  const dailyPending = MOCK_ORDERS.length;
  const criticalItems = ['Leche de Avena', 'Chocolate en Polvo'];

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center md:hidden">
              <span className="material-symbols-outlined text-on-primary text-[18px]">coffee</span>
            </div>
            <span className="font-display text-lg text-primary font-semibold md:hidden">DeerCoffee</span>
            <span className="text-base text-on-surface-variant hidden md:inline">Inicio</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {criticalItems.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface">{criticalItems.length}</span>
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-on-primary font-bold text-sm">{user?.avatar || 'U'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 md:pb-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="font-display text-lg text-primary tracking-tight">{greeting}, {name}!</h1>
            <span className="text-sm text-on-surface-variant flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline"></span>
              Turno Manana &bull; Abierto &bull; Roma Norte
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-[#6F4E37] to-primary p-5 text-on-primary shadow-lg">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[140px]">local_cafe</span>
          </div>
          <div className="relative z-10 mb-3">
            <div className="flex items-center gap-1.5 bg-on-primary/15 px-2.5 py-1 rounded-full backdrop-blur-sm w-fit mb-2">
              <span className="material-symbols-outlined text-[15px] text-secondary-container">payments</span>
              <span className="text-xs tracking-wider uppercase text-secondary-fixed font-semibold">Ventas Hoy</span>
            </div>
            <span className="font-display text-3xl font-bold leading-none">{formatCurrency(dailySales)}</span>
          </div>
          <div className="relative z-10 flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check_circle</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">{dailyOrders}</span>
                <span className="text-[0.625rem] opacity-80">Completadas</span>
              </div>
            </div>
            <div className="w-px bg-on-primary/20"></div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary-fixed">pending</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">{dailyPending}</span>
                <span className="text-[0.625rem] opacity-80">En cola</span>
              </div>
            </div>
            <div className="w-px bg-on-primary/20"></div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary-fixed">receipt_long</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">{formatCurrency(dailySales / dailyOrders)}</span>
                <span className="text-[0.625rem] opacity-80">Ticket prom.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/pos')} className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 active:scale-[0.97] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[22px]">point_of_sale</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-[0.8125rem] text-on-surface block">Nueva Venta</span>
            </div>
          </button>
          <button onClick={() => navigate('/kds')} className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 active:scale-[0.97] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container text-[22px]">coffee_maker</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-[0.8125rem] text-on-surface block">Mi Cocina</span>
            </div>
          </button>
          <button onClick={() => navigate('/inventario')} className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 active:scale-[0.97] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-container text-[22px]">inventory_2</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-[0.8125rem] text-on-surface block">Inventario</span>
            </div>
          </button>
          <button onClick={() => navigate('/reportes')} className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 active:scale-[0.97] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-error-container text-[22px]">analytics</span>
            </div>
            <div className="text-center">
              <span className="font-semibold text-[0.8125rem] text-on-surface block">Reportes</span>
            </div>
          </button>
        </div>

        {criticalItems.length > 0 && (
          <div className="bg-error/5 border border-error/20 rounded-xl p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <div className="flex-1">
              <span className="font-semibold text-[0.8125rem] text-on-surface block">Stock Critico</span>
              <span className="text-[0.75rem] text-on-surface-variant">{criticalItems.join(', ')}</span>
            </div>
            <button onClick={() => navigate('/inventario')} className="btn-ghost text-[0.75rem] py-1">Ver</button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-on-surface font-semibold">Ordenes Activas</h2>
            <button onClick={() => navigate('/kds')} className="text-secondary text-sm font-semibold hover:underline">Ver todas</button>
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_ORDERS.length === 0 ? (
              <p className="text-on-surface-variant text-base py-4 text-center">No hay ordenes activas</p>
            ) : (
              MOCK_ORDERS.slice(0, 5).reverse().map((order) => (
                <div key={order.id} className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[0.875rem] ${STATUS_COLORS[order.status]}`}>
                      #{order.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[0.8125rem] text-on-surface">
                          {order.table ? `Mesa ${order.table}` : 'Para Llevar'}
                        </span>
                        <span className="text-[0.6875rem] text-on-surface-variant">{order.customer}</span>
                      </div>
                      <span className="text-[0.6875rem] text-on-surface-variant">
                        {order.items.length} items &bull; {timeAgo(order.createdAt)} &bull; {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
