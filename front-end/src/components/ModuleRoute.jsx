import { Navigate } from 'react-router-dom';

export default function ModuleRoute({ hasModule, moduleKey, children }) {
    if (!hasModule(moduleKey)) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}
