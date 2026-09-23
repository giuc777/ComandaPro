import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { formatCurrency } from '../utils/format';
import SalesTrendChart from '../components/reports/SalesTrendChart';

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff === 1) return '1 min';
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ user }) {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(true);

    const greeting = new Date().getHours() < 12
        ? 'Buenos dias'
        : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
    const name = user?.name?.split(' ')[0] || 'Barista';
    const isAdmin = user?.role === 'Administrador';

    const load = useCallback(async () => {
        try {
            const [dash, currentShift] = await Promise.all([
                api.getDashboard(),
                api.getCurrentShift().catch(() => null),
            ]);
            setData(dash);
            setShift(currentShift);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const summary = data?.summary || {};
    const activeOrders = data?.activeOrders || [];
    const lowStock = data?.lowStock || [];
    const trend = data?.trend || [];

    const quickActions = [
        { to: '/pos', icon: 'point_of_sale', label: 'Nueva Venta', bg: 'bg-primary-container', color: 'text-on-primary' },
        { to: '/kds', icon: 'coffee_maker', label: 'Mi Cocina', bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
        { to: '/inventario', icon: 'inventory_2', label: 'Inventario', bg: 'bg-tertiary-container', color: 'text-on-tertiary-container' },
        ...(isAdmin
            ? [{ to: '/reportes', icon: 'analytics', label: 'Reportes', bg: 'bg-error-container', color: 'text-on-error-container' }]
            : []),
    ];

    return (
        <div className="flex flex-col min-h-screen bg-surface">
            <header className="sticky top-0 w-full z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20">
                <div className="h-14 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center md:hidden">
                            <span className="material-symbols-outlined text-on-primary text-[18px]">coffee</span>
                        </div>
                        <span className="font-display text-lg text-primary font-semibold md:hidden">DeerCoffee</span>
                        <span className="text-base text-on-surface-variant hidden md:inline">Inicio</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/inventario')}
                            className="relative w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                            {lowStock.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface">
                                    {lowStock.length}
                                </span>
                            )}
                        </button>
                        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                            <span className="text-on-primary font-bold text-sm">{user?.avatar || 'U'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 pb-24 md:pb-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between pt-2">
                    <div>
                        <h1 className="font-display text-lg text-primary tracking-tight">{greeting}, {name}!</h1>
                        <span className="text-sm text-on-surface-variant flex items-center gap-1.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${shift ? 'bg-tertiary' : 'bg-outline'}`}></span>
                            {shift ? `Turno Abierto \u2022 ${shift.station}` : 'Sin turno abierto'}
                        </span>
                    </div>
                    {!shift && (
                        <button onClick={() => navigate('/caja')} className="btn-secondary text-[0.75rem] py-1.5">
                            <span className="material-symbols-outlined text-[16px]">savings</span> Abrir turno
                        </button>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-[#6F4E37] to-primary p-5 text-on-primary shadow-lg">
                    <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                        <span className="material-symbols-outlined text-[140px]">local_cafe</span>
                    </div>
                    <div className="relative z-10 mb-3">
                        <div className="flex items-center gap-1.5 bg-on-primary/15 px-2.5 py-1 rounded-full backdrop-blur-sm w-fit mb-2">
                            <span className="material-symbols-outlined text-[15px] text-secondary-container">payments</span>
                            <span className="text-xs tracking-wider uppercase text-secondary-fixed font-semibold">Ventas Hoy</span>
                        </div>
                        <span className="font-display text-3xl font-bold leading-none">
                            {loading ? '\u2014' : formatCurrency(summary.today_sales)}
                        </span>
                    </div>
                    <div className="relative z-10 flex gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check_circle</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">{summary.today_orders || 0}</span>
                                <span className="text-[0.625rem] opacity-80">Ordenes</span>
                            </div>
                        </div>
                        <div className="w-px bg-on-primary/20"></div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">pending</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">{summary.pending_orders || 0}</span>
                                <span className="text-[0.625rem] opacity-80">En cola</span>
                            </div>
                        </div>
                        <div className="w-px bg-on-primary/20"></div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary-fixed">receipt_long</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">{formatCurrency(summary.avg_ticket)}</span>
                                <span className="text-[0.625rem] opacity-80">Ticket prom.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`grid gap-3 ${quickActions.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {quickActions.map((action) => (
                        <button
                            key={action.to}
                            onClick={() => navigate(action.to)}
                            className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 active:scale-[0.97] transition-transform"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.bg}`}>
                                <span className={`material-symbols-outlined text-[22px] ${action.color}`}>{action.icon}</span>
                            </div>
                            <span className="font-semibold text-[0.8125rem] text-on-surface text-center">{action.label}</span>
                        </button>
                    ))}
                </div>

                {lowStock.length > 0 && (
                    <div className="bg-error/5 border border-error/20 rounded-xl p-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                        <div className="flex-1 min-w-0">
                            <span className="font-semibold text-[0.8125rem] text-on-surface block">Stock Critico</span>
                            <span className="text-[0.75rem] text-on-surface-variant block truncate">
                                {lowStock.map((i) => i.name).join(', ')}
                            </span>
                        </div>
                        <button onClick={() => navigate('/inventario')} className="btn-ghost text-[0.75rem] py-1">Ver</button>
                    </div>
                )}

                <SalesTrendChart data={trend} title="Ventas Ultimos 7 Dias" height={180} />

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-display text-lg text-on-surface font-semibold">Ordenes Activas</h2>
                        <button onClick={() => navigate('/pos')} className="text-secondary text-sm font-semibold hover:underline">
                            Ver POS
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {loading ? (
                            <p className="text-on-surface-variant text-sm py-4 text-center">Cargando ordenes...</p>
                        ) : activeOrders.length === 0 ? (
                            <p className="text-on-surface-variant text-base py-4 text-center">No hay ordenes activas</p>
                        ) : (
                            activeOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[0.875rem] bg-secondary-container text-on-secondary-container flex-shrink-0">
                                            #{order.id}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[0.8125rem] text-on-surface truncate">
                                                    {order.table_name || 'Para Llevar'}
                                                </span>
                                                {order.customer_name && (
                                                    <span className="text-[0.6875rem] text-on-surface-variant truncate">
                                                        {order.customer_name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[0.6875rem] text-on-surface-variant">
                                                {order.item_count} items &bull; {timeAgo(order.created_at)} &bull; {formatTime(order.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="font-display text-sm font-bold text-on-surface flex-shrink-0">
                                        {formatCurrency(order.total)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
