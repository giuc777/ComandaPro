import { useState, useEffect } from 'react';

export default function LoginPage({ onLogin, error }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ username: false, password: false });
    const [showSuccess, setShowSuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const clearErrors = () => {
        setFieldErrors({ username: false, password: false });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        clearErrors();

        let valid = true;
        if (!username.trim()) {
            setFieldErrors(prev => ({ ...prev, username: true }));
            valid = false;
        }
        if (!password) {
            setFieldErrors(prev => ({ ...prev, password: true }));
            valid = false;
        }
        if (!valid) return;

        setLoading(true);
        const result = await onLogin(username, password);
        if (result) {
            setShowSuccess(true);
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 800);
        }
        setLoading(false);
    };

    const handleDemo = () => {
        setUsername('mateo');
        setPassword('barista123');
        clearErrors();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-4 sm:py-6">
            <section className="relative w-full max-w-[400px] mx-auto overflow-hidden bg-primary-container text-on-primary rounded-t-2xl py-5 sm:py-6 px-5 flex flex-col items-center justify-center">
                <div className="absolute inset-0 pointer-events-none opacity-10">
                    <svg className="w-56 h-56 -ml-10 -mt-5 text-on-primary fill-current" viewBox="0 0 200 200">
                        <path d="M42.8,112.5 C36.2,85.1 52.3,55.9 79.7,47.3 C107.1,38.7 135.5,54.1 143.2,81.6 C150.9,109.1 135,138.3 107.6,146.9 C80.2,155.5 49.4,140 42.8,112.5 Z"/>
                    </svg>
                </div>
                <svg className="absolute top-3 inset-x-0 mx-auto w-44 h-14 stroke-on-primary opacity-15 fill-none" strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 200 60">
                    <path d="M30 50 Q 45 30 35 15 T 40 0"></path>
                    <path d="M100 55 Q 115 35 105 20 T 110 5"></path>
                    <path d="M170 50 Q 185 30 175 15 T 180 0"></path>
                </svg>
                <div className="relative z-10 flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                    <div className="w-11 h-11 bg-surface-container-lowest rounded-xl p-1 shadow-md flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary-container text-[28px]">coffee</span>
                    </div>
                    <span className="font-display text-lg sm:text-xl font-bold tracking-tight">DeerCoffee</span>
                    <p className="font-body text-sm sm:text-base opacity-90 tracking-wide">El control de tu cafe en tus manos</p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/40 text-xs sm:text-sm font-semibold mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed pulse-dot"></span>
                        Terminal POS v3.4
                    </div>
                </div>
            </section>

            <section className="w-full max-w-[400px] mx-auto bg-surface-container-lowest rounded-b-2xl shadow-xl p-5 sm:p-6">
                <div className="mb-4">
                    <h1 className="font-display text-xl sm:text-lg text-on-surface font-semibold">Bienvenido de vuelta</h1>
                    <p className="text-sm sm:text-base text-on-surface-variant mt-0.5">Ingresa tus credenciales de barista o administrador.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Nombre de usuario</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">person</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); clearErrors(); }}
                                className="input-field pl-12 py-2.5 text-[0.8125rem]"
                                placeholder="Tu nombre de usuario"
                                autoComplete="username"
                            />
                        </div>
                        {fieldErrors.username && <p className="text-error text-[0.6875rem] mt-0.5">Este campo es obligatorio</p>}
                    </div>

                    <div>
                        <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider text-[0.6875rem]">Contrasena</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">lock</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                                className="input-field pl-12 pr-10 py-2.5 text-[0.8125rem]"
                                placeholder="Tu contrasena"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                        {fieldErrors.password && <p className="text-error text-[0.6875rem] mt-0.5">Contrasena requerida</p>}
                    </div>

                    {error && (
                        <div className="bg-error-container text-on-error-container rounded-xl p-2.5 flex items-center gap-2 text-[0.75rem] font-semibold">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full text-sm font-bold py-2.5 min-h-[44px]"
                    >
                        <span className="material-symbols-outlined text-[18px]">login</span>
                        {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDemo}
                        className="btn-ghost w-full text-sm justify-center py-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">science</span>
                        Usar credenciales de prueba
                    </button>
                </form>

                <div className="divider my-4"></div>

                <div className="flex items-center justify-between text-[0.6875rem] text-on-surface-variant flex-wrap gap-1">
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">storefront</span>
                        <span>Sucursal Roma Norte</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>{currentTime}</span>
                    </div>
                </div>
            </section>

            {showSuccess && (
                <div className="fixed top-6 right-6 bg-tertiary text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold text-[0.875rem] transition-transform duration-300 z-50">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Sesion iniciada correctamente</span>
                </div>
            )}
        </div>
    );
}
