import { NavLink } from 'react-router-dom';

export default function MobileNav() {
  const items = [
    { to: '/dashboard', icon: 'dashboard', label: 'Inicio' },
    { to: '/pos', icon: 'point_of_sale', label: 'Ventas' },
    { to: '/kds', icon: 'coffee_maker', label: 'Cocina' },
    { to: '/caja', icon: 'savings', label: 'Caja' },
    { to: '/ajustes', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <nav className="mobile-nav items-center justify-around px-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 ${isActive ? 'text-primary-container' : 'text-on-surface-variant'}`
          }
        >
          <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
          <span className="text-[0.625rem] font-semibold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
