import { NavLink } from 'react-router-dom';

export default function Sidebar({ user, onLogout }) {
  const navItems = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/pos', icon: 'point_of_sale', label: 'Ventas POS' },
    { to: '/kds', icon: 'coffee_maker', label: 'Cocina KDS' },
    { to: '/caja', icon: 'savings', label: 'Caja' },
    { to: '/productos', icon: 'local_cafe', label: 'Productos' },
    { to: '/inventario', icon: 'inventory_2', label: 'Inventario' },
    { to: '/proveedores', icon: 'local_shipping', label: 'Proveedores' },
    { to: '/catalogos', icon: 'category', label: 'Catalogos' },
    { to: '/reportes', icon: 'analytics', label: 'Reportes', adminOnly: true },
  ];

  return (
    <aside className="sidebar-desktop fixed top-0 left-0 bottom-0 w-64 bg-surface-container-lowest border-r border-outline-variant/30 flex-col z-40">
      <div className="p-4 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[22px]">coffee</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg text-primary font-semibold leading-tight">DeerCoffee</span>
            <span className="font-body text-xs text-secondary tracking-widest uppercase">Specialty POS</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 bg-surface-container p-2 rounded-xl">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold text-[0.6875rem]">Sucursal</span>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-[18px]">storefront</span>
            <span className="font-semibold text-[0.875rem] text-on-surface">Roma Norte</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            (item.adminOnly && user?.role !== 'Administrador') ? null : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl ${isActive ? 'active' : 'text-on-surface-variant'}`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-semibold text-[0.875rem]">{item.label}</span>
              </NavLink>
            )
          ))}
          <div className="divider" />
          <NavLink
            to="/ajustes"
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl ${isActive ? 'active' : 'text-on-surface-variant'}`
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-semibold text-[0.875rem]">Ajustes</span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
            <span className="text-on-primary font-bold text-sm">{user?.avatar || 'U'}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-[0.8125rem] text-on-surface truncate">{user?.name || 'Usuario'}</span>
            <span className="text-[0.6875rem] text-on-surface-variant">{user?.role || 'Rol'}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            title="Cerrar sesion"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
