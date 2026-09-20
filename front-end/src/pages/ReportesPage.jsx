const TOP_PRODUCTS = [
  { name: 'Latte Vainilla', qty: 12, total: 336 },
  { name: 'Cold Brew Nitro', qty: 8, total: 256 },
  { name: 'Capuchino Clasico', qty: 7, total: 168 },
  { name: 'Matcha Latte', qty: 6, total: 180 },
  { name: 'V60 Origen Unico', qty: 4, total: 180 },
];

function formatCurrency(amount) {
  return `Q ${amount.toFixed(2)}`;
}

export default function ReportesPage() {

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg text-primary font-semibold">Reportes & Finanzas</h1>
              <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-tertiary/10 text-tertiary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span> En Vivo
              </span>
            </div>
            <span className="text-sm text-on-surface-variant">Inteligencia Operativa</span>
          </div>
          <button className="btn-secondary text-[0.75rem] py-1.5">
            <span className="material-symbols-outlined text-[16px]">download</span> PDF / Excel
          </button>
        </div>

        <div className="px-4 md:px-6 pb-2 flex gap-1.5">
          {['Hoy', 'Ayer', 'Esta semana', 'Este mes'].map((dr) => (
            <button key={dr} className={`tab-pill text-[0.75rem] ${dr === 'Hoy' ? 'active' : ''}`}>{dr}</button>
          ))}
        </div>

        <div className="px-4 md:px-6 pb-2 flex gap-2">
          <button className="tab-pill active">Ventas</button>
          <button className="tab-pill">Inventario</button>
          <button className="tab-pill">Ranking</button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-[#6F4E37] to-primary p-5 text-on-primary shadow-lg">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[120px]">analytics</span>
          </div>
          <div className="relative z-10 mb-3">
            <span className="text-xs tracking-wider uppercase opacity-80">Resumen del Dia</span>
            <div className="font-display text-3xl font-bold leading-none mt-1">{formatCurrency(1285.50)}</div>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-3">
            <div>
              <span className="text-[0.625rem] opacity-80">Efectivo</span>
              <span className="text-sm font-bold block">Q 820.00</span>
            </div>
            <div>
              <span className="text-[0.625rem] opacity-80">Tarjeta</span>
              <span className="text-sm font-bold block">Q 465.50</span>
            </div>
            <div>
              <span className="text-[0.625rem] opacity-80">Transacciones</span>
              <span className="text-sm font-bold block">24</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Top 5 Productos</h3>
          <div className="flex flex-col gap-2">
            {TOP_PRODUCTS.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-primary w-6 text-center">{index + 1}</span>
                  <div>
                    <span className="font-semibold text-[0.8125rem] text-on-surface block">{product.name}</span>
                    <span className="text-[0.6875rem] text-on-surface-variant">{product.qty} unidades</span>
                  </div>
                </div>
                <span className="font-display text-sm font-bold text-on-surface">{formatCurrency(product.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Metricas Clave</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="kpi-card">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Ticket Promedio</span>
              <span className="font-display text-lg text-on-surface font-bold mt-1 block">{formatCurrency(1285.50 / 24)}</span>
            </div>
            <div className="kpi-card">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Items / Ticket</span>
              <span className="font-display text-lg text-on-surface font-bold mt-1 block">2.3</span>
            </div>
            <div className="kpi-card">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Clientes Atendidos</span>
              <span className="font-display text-lg text-on-surface font-bold mt-1 block">43</span>
            </div>
            <div className="kpi-card">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Margen Bruto</span>
              <span className="font-display text-lg text-tertiary font-bold mt-1 block">68%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
