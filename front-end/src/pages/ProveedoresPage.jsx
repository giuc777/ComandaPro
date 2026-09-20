const MOCK_SUPPLIERS = [
  { id: 1, name: 'Cafes del Valle S.A.', contact: 'Roberto Mendez', phone: '+502 2345-6789', email: 'ventas@cafevalle.gt', status: 'Activo', pendingPayment: 2420 },
  { id: 2, name: 'Lacteos Frescos Ltda.', contact: 'Maria Gutierrez', phone: '+502 4455-1122', email: 'pedidos@lacteosfrescos.gt', status: 'Activo', pendingPayment: 680 },
  { id: 3, name: 'Importaciones Gourmet', contact: 'Carlos Pineda', phone: '+502 5566-3344', email: 'orders@importgourmet.gt', status: 'Activo', pendingPayment: 320 },
];

function formatCurrency(amount) {
  return `Q ${amount.toLocaleString()}`;
}

export default function ProveedoresPage() {
  const totalPending = MOCK_SUPPLIERS.reduce((s, sp) => s + sp.pendingPayment, 0);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-lg text-primary font-semibold">Proveedores</h1>
              <span className="badge bg-primary-container text-on-primary">{MOCK_SUPPLIERS.length}</span>
              {totalPending > 0 && (
                <span className="flex items-center gap-1 text-error text-[0.75rem] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">warning</span> {formatCurrency(totalPending)} pendiente
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-2 text-[0.75rem]">
              <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span> Orden
            </button>
            <button className="btn-primary py-1 px-2 text-[0.75rem]">
              <span className="material-symbols-outlined text-[14px]">person_add</span> Nuevo
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Activos</span>
            </div>
            <span className="font-display text-lg text-on-surface font-bold">{MOCK_SUPPLIERS.filter(s => s.status === 'Activo').length}</span>
          </div>
          <div className="kpi-card border border-error/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-error text-[18px]">account_balance</span>
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Por Pagar</span>
            </div>
            <span className="font-display text-lg text-error font-bold">{formatCurrency(totalPending)}</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-secondary text-[18px]">local_shipping</span>
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">En Transito</span>
            </div>
            <span className="font-display text-lg text-on-surface font-bold">2</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {MOCK_SUPPLIERS.map((supplier) => (
            <div key={supplier.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container text-[20px]">business</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[0.875rem] text-on-surface block">{supplier.name}</span>
                    <span className="text-[0.75rem] text-on-surface-variant">{supplier.contact}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${supplier.status === 'Activo' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {supplier.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">phone</span> {supplier.phone}
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">mail</span> {supplier.email}
                </div>
              </div>
              {supplier.pendingPayment > 0 && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Pendiente de pago</span>
                  <span className="font-display text-sm font-bold text-error">{formatCurrency(supplier.pendingPayment)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
