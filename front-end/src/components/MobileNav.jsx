import { NavLink } from 'react-router-dom';

export default function MobileNav({ user, hasModule }) {
  const items = [
    { to: '/dashboard', icon: 'dashboard', label: 'Inicio', module: 'dashboard' },
    { to: '/pos', icon: 'point_of_sale', label: 'Ventas', module: 'pos' },
    { to: '/productos', icon: 'local_cafe', label: 'Productos', module: 'productos' },
    { to: '/kds', icon: 'coffee_maker', label: 'Cocina', module: 'kds' },
    { to: '/caja', icon: 'savings', label: 'Caja', module: 'caja' },
    { to: '/reportes', icon: 'analytics', label: 'Reportes', module: 'reportes' },
    { to: '/ajustes', icon: 'settings', label: 'Ajustes' },
  ];

  if (user?.role === 'Administrador') {
    items.splice(6, 0, { to: '/usuarios', icon: 'group', label: 'Usuarios' });
  }

  return (
    <nav className="mobile-nav items-center justify-around px-1">
      {items.map((item) => (
        (item.module && hasModule && !hasModule(item.module)) ? null : (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-2 ${isActive ? 'text-primary-container' : 'text-on-surface-variant'}`
            }
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-[0.625rem] font-semibold">{item.label}</span>
          </NavLink>
        )
      ))}
    </nav>
  );
}
