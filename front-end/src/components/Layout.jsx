import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout({ children, user, onLogout, hasModule }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    if (isLoginPage) {
      document.body.classList.remove('route-app');
    } else {
      document.body.classList.add('route-app');
    }
    return () => document.body.classList.remove('route-app');
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={user} onLogout={onLogout} hasModule={hasModule} />
      <div className="main-content min-h-screen pb-24 md:pb-0">
        {children}
      </div>
      <MobileNav user={user} hasModule={hasModule} />
    </div>
  );
}
