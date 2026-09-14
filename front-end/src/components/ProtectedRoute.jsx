import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, isAuthenticated, loading }) {
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Cargando...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
