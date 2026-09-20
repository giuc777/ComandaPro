import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameMsg({ type: 'error', text: 'Este campo es obligatorio' });
      return;
    }
    setUsernameMsg({ type: 'success', text: 'Nombre de usuario actualizado' });
    setNewUsername('');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Todos los campos son obligatorios' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contrasenas no coinciden' });
      return;
    }
    setPasswordMsg({ type: 'success', text: 'Contrasena actualizada' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg text-primary font-semibold">Ajustes & Perfil</h1>
            <span className="text-sm text-on-surface-variant">Gestion de usuarios y configuracion</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-5 max-w-3xl mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center">
              <span className="text-on-primary font-display font-bold text-xl">{user?.avatar || 'U'}</span>
            </div>
            <div>
              <h2 className="font-display text-lg text-on-surface font-semibold">{user?.name || 'Usuario'}</h2>
              <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-primary-container/10 text-primary">{user?.role || 'Rol'}</span>
              <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">storefront</span>
                <span>{user?.sucursal || 'Sucursal'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="text-tertiary font-semibold">En linea</span>
              </div>
            </div>
          </div>

          <div className="divider"></div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex flex-col gap-1">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Email</span>
              <span className="text-[0.875rem] text-on-surface font-medium">{user?.email || ''}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">Sucursal</span>
              <span className="text-[0.875rem] text-on-surface font-medium">{user?.sucursal || ''}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Cambiar Nombre de Usuario</h3>
          <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Nombre de usuario actual</label>
              <input type="text" className="input-field bg-surface-container" value={user?.username || ''} disabled />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Nuevo nombre de usuario</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nuevo nombre de usuario"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            {usernameMsg && (
              <p className={`text-[0.75rem] ${usernameMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>
                {usernameMsg.text}
              </p>
            )}
            <button type="submit" className="btn-primary self-start">
              <span className="material-symbols-outlined text-[18px]">person</span> Actualizar
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
          <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Cambiar Contrasena</h3>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Contrasena actual</label>
              <input
                type="password"
                className="input-field"
                placeholder="Tu contrasena actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Nueva contrasena</label>
              <input
                type="password"
                className="input-field"
                placeholder="Nueva contrasena"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.75rem]">Confirmar</label>
              <input
                type="password"
                className="input-field"
                placeholder="Repetir contrasena"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordMsg && (
              <p className={`text-[0.75rem] ${passwordMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>
                {passwordMsg.text}
              </p>
            )}
            <button type="submit" className="btn-primary self-start">
              <span className="material-symbols-outlined text-[18px]">lock</span> Actualizar
            </button>
          </form>
        </div>

        {user?.role === 'Administrador' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-on-surface font-semibold">Gestion de Usuarios</h3>
              <button className="btn-primary text-[0.75rem] py-1.5">
                <span className="material-symbols-outlined text-[16px]">person_add</span> Nuevo
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
                    <span className="text-on-primary font-bold text-sm">AL</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[0.875rem] text-on-surface block">Ana Lopez</span>
                    <span className="text-[0.75rem] text-on-surface-variant">admin@deercoffee.cafe</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-primary-container/10 text-primary">Administrador</span>
                  <button className="btn-ghost py-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
                    <span className="text-on-primary font-bold text-sm">MR</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[0.875rem] text-on-surface block">Mateo Rodriguez</span>
                    <span className="text-[0.75rem] text-on-surface-variant">barista@deercoffee.cafe</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-secondary-container/10 text-secondary">Barista</span>
                  <button className="btn-ghost py-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button onClick={handleLogout} className="btn-danger w-full justify-center">
          <span className="material-symbols-outlined text-[18px]">logout</span> Cerrar Sesion
        </button>
      </main>
    </div>
  );
}
