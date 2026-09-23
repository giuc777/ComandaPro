import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!localStorage.getItem('user')) return;
        api.getProfile().then(data => {
            if (data && !data.error && data.role) {
                localStorage.setItem('user', JSON.stringify(data));
                setUser(data);
            }
        }).catch(() => {});
    }, []);

    const login = useCallback(async (username, password) => {
        setError(null);
        try {
            const data = await api.login(username, password);

            if (data.error) {
                setError(data.error);
                return false;
            }

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return true;
        } catch {
            setError('Error de conexión');
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.logout(refreshToken);
        } catch {
            // Ignore errors on logout
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []);

    const hasModule = useCallback((moduleKey) => {
        if (!user) return false;
        if (user.role === 'Administrador') return true;
        return user.permissions?.includes(moduleKey) ?? false;
    }, [user]);

    const isAdmin = user?.role === 'Administrador';

    return {
        user,
        loading,
        error,
        login,
        logout,
        isAdmin,
        hasModule,
        isAuthenticated: !!user
    };
}
