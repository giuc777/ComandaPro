import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children, user }) {
    if (user?.role !== 'Administrador') {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}
