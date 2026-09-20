const MOCK_INVENTORY = [
  { id: 1, name: 'Cafe en Granos Arabica', unit: 'kg', stock: 25, minStock: 10, cost: 168 },
  { id: 2, name: 'Leche Entera', unit: 'litros', stock: 45, minStock: 15, cost: 18 },
  { id: 3, name: 'Leche de Avena', unit: 'litros', stock: 5, minStock: 8, cost: 32 },
  { id: 4, name: 'Vainilla Sintetica', unit: 'ml', stock: 500, minStock: 200, cost: 0.08 },
  { id: 5, name: 'Chocolate en Polvo', unit: 'kg', stock: 1.5, minStock: 2, cost: 85 },
  { id: 6, name: 'Matcha en Polvo', unit: 'g', stock: 150, minStock: 50, cost: 0.45 },
  { id: 7, name: 'Almendra Fileteada', unit: 'kg', stock: 1.5, minStock: 1, cost: 120 },
  { id: 8, name: 'Hojaldre Precortado', unit: 'unidades', stock: 40, minStock: 20, cost: 3.50 },
];

function formatCurrency(amount) {
  return `Q ${amount.toFixed(2)}`;
}

export default function InventarioPage() {
  const criticalItems = MOCK_INVENTORY.filter(i => i.stock <= i.minStock);
  const totalValue = MOCK_INVENTORY.reduce((s, i) => s + (i.stock * i.cost), 0);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Inventario</h1>
            <span className="text-sm text-on-surface-variant flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot"></span>
              {MOCK_INVENTORY.length} insumos activos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-[0.75rem] py-1.5">
              <span className="material-symbols-outlined text-[16px]">download</span> Exportar
            </button>
            <button className="btn-primary text-[0.75rem] py-1.5">
              <span className="material-symbols-outlined text-[16px]">add</span> Nuevo
            </button>
          </div>
        </div>

        <div className="px-4 md:px-6 pb-2 flex gap-2">
          <button className="tab-pill active">Insumos <span className="badge bg-primary-container/20 text-primary ml-1">{MOCK_INVENTORY.length}</span></button>
          <button className="tab-pill">Recetas</button>
          <button className="tab-pill">Movimientos</button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Valorizacion</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">{formatCurrency(totalValue)}</div>
          </div>
          <div className={`kpi-card ${criticalItems.length > 0 ? 'border border-error/30' : ''}`}>
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Criticos</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`font-display text-lg font-bold ${criticalItems.length > 0 ? 'text-error' : 'text-on-surface'}`}>{criticalItems.length}</span>
              {criticalItems.length > 0 && <span className="material-symbols-outlined text-error text-[16px]">warning</span>}
            </div>
          </div>
          <div className="kpi-card">
            <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Categorias</span>
            <div className="font-display text-lg text-on-surface font-bold mt-1">4</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">
                <th className="text-left px-4 py-2.5">Insumo</th>
                <th className="text-left px-4 py-2.5">Stock</th>
                <th className="text-left px-4 py-2.5">Minimo</th>
                <th className="text-left px-4 py-2.5">Estado</th>
                <th className="text-right px-4 py-2.5">Accion</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVENTORY.map((item) => {
                const isCritical = item.stock <= item.minStock;
                return (
                  <tr key={item.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[0.8125rem] text-on-surface block">{item.name}</span>
                      <span className="text-[0.6875rem] text-on-surface-variant">{formatCurrency(item.cost)}/{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[0.875rem] text-on-surface">{item.stock} {item.unit}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-[0.8125rem]">{item.minStock} {item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${isCritical ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
                        {isCritical ? 'Critico' : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost py-1 text-[0.6875rem]">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
