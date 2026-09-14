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
        } catch (err) {
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

    const isAdmin = user?.role === 'Administrador';

    return {
        user,
        loading,
        error,
        login,
        logout,
        isAdmin,
        isAuthenticated: !!user
    };
}
