import { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { useConfirm } from '../hooks/useConfirm';

const MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'pos', label: 'Ventas POS' },
    { key: 'kds', label: 'Cocina KDS' },
    { key: 'caja', label: 'Caja' },
    { key: 'productos', label: 'Productos' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'proveedores', label: 'Proveedores' },
    { key: 'catalogos', label: 'Catalogos' },
    { key: 'reportes', label: 'Reportes' },
    { key: 'ajustes', label: 'Ajustes' },
];

export default function UsuariosPage({ user }) {
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [sucursalMsg, setSucursalMsg] = useState(null);
    const [sucursalVal, setSucursalVal] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [newUser, setNewUser] = useState({ username: '', password: '', name: '', email: '', role: 'Barista' });
    const [editUser, setEditUser] = useState({ name: '', email: '', role: '' });
    const [newPassword, setNewPassword] = useState('');
    const [formMsg, setFormMsg] = useState(null);
    const { confirm, confirmModal } = useConfirm();

    const loadData = async () => {
        try {
            const [usersData, settingsData, permsData] = await Promise.all([
                api.getUsers(),
                api.getSettings(),
                api.getPermissions()
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setPermissions(permsData || {});
            setSucursalVal(settingsData?.sucursal_nombre || 'Roma Norte');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSaveSucursal = async () => {
        if (!sucursalVal.trim()) return;
        try {
            await api.updateSetting('sucursal_nombre', sucursalVal.trim());
            setSucursalMsg({ type: 'success', text: 'Sucursal actualizada' });
            setTimeout(() => setSucursalMsg(null), 3000);
        } catch {
            setSucursalMsg({ type: 'error', text: 'Error al actualizar' });
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormMsg(null);
        try {
            const result = await api.createUser(newUser);
            if (result.error) { setFormMsg({ type: 'error', text: result.error }); return; }
            setShowCreateModal(false);
            setNewUser({ username: '', password: '', name: '', email: '', role: 'Barista' });
            loadData();
        } catch { setFormMsg({ type: 'error', text: 'Error del servidor' }); }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setFormMsg(null);
        try {
            const result = await api.updateUser(selectedUser.id, editUser);
            if (result.error) { setFormMsg({ type: 'error', text: result.error }); return; }
            setShowEditModal(false);
            loadData();
        } catch { setFormMsg({ type: 'error', text: 'Error del servidor' }); }
    };

    const handlePassword = async (e) => {
        e.preventDefault();
        setFormMsg(null);
        if (newPassword.length < 8) { setFormMsg({ type: 'error', text: 'Mínimo 8 caracteres' }); return; }
        try {
            const result = await api.setUserPassword(selectedUser.id, newPassword);
            if (result.error) { setFormMsg({ type: 'error', text: result.error }); return; }
            setShowPasswordModal(false);
            setNewPassword('');
            setFormMsg({ type: 'success', text: 'Contraseña actualizada' });
        } catch { setFormMsg({ type: 'error', text: 'Error del servidor' }); }
    };

    const handleToggle = async (userId, field) => {
        const u = users.find(u => u.id === userId);
        if (!u) return;
        const newVal = field === 'active' ? !u.active : !u.is_locked;
        if (field === 'active') {
            await api.updateUser(userId, { active: newVal });
        } else {
            await api.unlockUser(userId);
        }
        loadData();
    };

    const handleDelete = async (userId) => {
        const u = users.find(x => x.id === userId);
        const ok = await confirm({
            title: 'Desactivar usuario',
            message: `¿Desactivar a ${u?.name || 'este usuario'}? No podrá iniciar sesión hasta que se reactive.`,
            confirmLabel: 'Desactivar',
            variant: 'danger',
            icon: 'person_off',
        });
        if (!ok) return;
        await api.deleteUser(userId);
        loadData();
    };

    const handlePermToggle = async (role, moduleKey) => {
        const current = permissions[role]?.[moduleKey] ?? false;
        const newModules = { ...permissions[role], [moduleKey]: !current };
        await api.updateRolePermissions(role, newModules);
        setPermissions(prev => ({ ...prev, [role]: newModules }));
    };

    const openEdit = (u) => {
        setSelectedUser(u);
        setEditUser({ name: u.name, email: u.email || '', role: u.role });
        setFormMsg(null);
        setShowEditModal(true);
    };

    const openPassword = (u) => {
        setSelectedUser(u);
        setNewPassword('');
        setFormMsg(null);
        setShowPasswordModal(true);
    };

    if (loading) return <div className="p-6 text-on-surface-variant">Cargando...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-lg text-primary font-semibold">Usuarios</h1>
                        <span className="text-sm text-on-surface-variant">Gestion de usuarios, sucursal y permisos</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">
                {/* SECCION: SUCURSAL */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                    <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Sucursal</h3>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">storefront</span>
                        <input
                            type="text"
                            value={sucursalVal}
                            onChange={e => setSucursalVal(e.target.value)}
                            className="input-field flex-1"
                            placeholder="Nombre de la sucursal"
                        />
                        <button onClick={handleSaveSucursal} className="btn-primary text-[0.75rem] py-2">
                            <span className="material-symbols-outlined text-[16px]">save</span> Guardar
                        </button>
                    </div>
                    {sucursalMsg && <p className={`text-[0.75rem] mt-2 ${sucursalMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>{sucursalMsg.text}</p>}
                </div>

                {/* SECCION: USUARIOS */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-display text-lg text-on-surface font-semibold">Usuarios</h3>
                        <button onClick={() => { setShowCreateModal(true); setFormMsg(null); setNewUser({ username: '', password: '', name: '', email: '', role: 'Barista' }); }} className="btn-primary text-[0.75rem] py-1.5">
                            <span className="material-symbols-outlined text-[16px]">person_add</span> Nuevo
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {users.map(u => (
                            <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl ${u.active ? 'bg-surface-container' : 'bg-surface-container-highest opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
                                        <span className="text-on-primary font-bold text-sm">{(u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[0.875rem] text-on-surface truncate">{u.name}</span>
                                            {!u.active && <span className="px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold bg-error-container/10 text-error">Inactivo</span>}
                                            {u.is_locked === 1 && <span className="px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold bg-error-container/10 text-error">Bloqueado</span>}
                                        </div>
                                        <span className="text-[0.75rem] text-on-surface-variant">{u.email || u.username}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[0.5625rem] font-bold ${u.role === 'Administrador' ? 'bg-primary-container/10 text-primary' : 'bg-secondary-container/10 text-secondary'}`}>{u.role}</span>
                                    <button onClick={() => openEdit(u)} className="btn-ghost py-1" title="Editar">
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                    </button>
                                    <button onClick={() => openPassword(u)} className="btn-ghost py-1" title="Cambiar contraseña">
                                        <span className="material-symbols-outlined text-[14px]">lock</span>
                                    </button>
                                    {u.is_locked === 1 && (
                                        <button onClick={() => handleToggle(u.id, 'locked')} className="btn-ghost py-1 text-tertiary" title="Desbloquear">
                                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                        </button>
                                    )}
                                    {u.id !== user?.id && (
                                        <>
                                            {u.active ? (
                                                <button onClick={() => handleDelete(u.id)} className="btn-ghost py-1 text-error" title="Desactivar">
                                                    <span className="material-symbols-outlined text-[14px]">person_off</span>
                                                </button>
                                            ) : (
                                                <button onClick={() => handleToggle(u.id, 'active')} className="btn-ghost py-1 text-tertiary" title="Activar">
                                                    <span className="material-symbols-outlined text-[14px]">person</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCION: PERMISOS POR ROL */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                    <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Permisos por Rol</h3>
                    <p className="text-[0.75rem] text-on-surface-variant mb-4">Define qué módulos puede ver cada rol. Los administradores siempre tienen acceso completo.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[0.75rem]">
                            <thead>
                                <tr className="border-b border-outline-variant/20">
                                    <th className="text-left py-2 pr-4 font-semibold text-on-surface-variant">Módulo</th>
                                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant">Administrador</th>
                                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant">Barista</th>
                                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant">Cajero</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(m => (
                                    <tr key={m.key} className="border-b border-outline-variant/10">
                                        <td className="py-2.5 pr-4 font-medium text-on-surface">{m.label}</td>
                                        {['Administrador', 'Barista', 'Cajero'].map(role => {
                                            const checked = role === 'Administrador' ? true : (permissions[role]?.[m.key] ?? false);
                                            return (
                                                <td key={role} className="text-center py-2.5 px-3">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={role === 'Administrador'}
                                                            onChange={() => handlePermToggle(role, m.key)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL: CREAR USUARIO */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content max-w-md w-[calc(100vw-2rem)]" onClick={e => e.stopPropagation()}>
                        <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Nuevo Usuario</h3>
                        <form onSubmit={handleCreate} className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Nombre</label>
                                <input type="text" className="input-field" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Username</label>
                                <input type="text" className="input-field" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Email</label>
                                <input type="email" className="input-field" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Contraseña</label>
                                <input type="password" className="input-field" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Rol</label>
                                <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="Barista">Barista</option>
                                    <option value="Cajero">Cajero</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                            {formMsg && <p className={`text-[0.75rem] ${formMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>{formMsg.text}</p>}
                            <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1">Crear</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDITAR USUARIO */}
            {showEditModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content max-w-md w-[calc(100vw-2rem)]" onClick={e => e.stopPropagation()}>
                        <h3 className="font-display text-lg text-on-surface font-semibold mb-3">Editar Usuario</h3>
                        <form onSubmit={handleEdit} className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Nombre</label>
                                <input type="text" className="input-field" value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Email</label>
                                <input type="email" className="input-field" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Rol</label>
                                <select className="input-field" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                    <option value="Barista">Barista</option>
                                    <option value="Cajero">Cajero</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                            {formMsg && <p className={`text-[0.75rem] ${formMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>{formMsg.text}</p>}
                            <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1">Guardar</button>
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn-ghost flex-1">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CAMBIAR CONTRASEÑA */}
            {showPasswordModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content max-w-md w-[calc(100vw-2rem)]" onClick={e => e.stopPropagation()}>
                        <h3 className="font-display text-lg text-on-surface font-semibold mb-1">Cambiar Contraseña</h3>
                        <p className="text-[0.75rem] text-on-surface-variant mb-3">Usuario: <strong>{selectedUser.name}</strong></p>
                        <form onSubmit={handlePassword} className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Nueva contraseña</label>
                                <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoFocus />
                                <span className="text-[0.625rem] text-on-surface-variant mt-0.5">Mínimo 8 caracteres</span>
                            </div>
                            {formMsg && <p className={`text-[0.75rem] ${formMsg.type === 'error' ? 'text-error' : 'text-tertiary'}`}>{formMsg.text}</p>}
                            <div className="flex gap-2">
                                <button type="submit" className="btn-primary flex-1">Actualizar</button>
                                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-ghost flex-1">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmModal}
        </div>
    );
}
