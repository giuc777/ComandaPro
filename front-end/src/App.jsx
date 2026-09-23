import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/SettingsPage';
import PosPage from './pages/PosPage';
import KdsPage from './pages/KdsPage';
import CajaPage from './pages/CajaPage';
import InventarioPage from './pages/InventarioPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ReportesPage from './pages/ReportesPage';
import CatalogosPage from './pages/CatalogosPage';
import CatalogoDetallePage from './pages/CatalogoDetallePage';
import ProductosPage from './pages/ProductosPage';
import UsuariosPage from './pages/UsuariosPage';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleRoute from './components/ModuleRoute';
import Layout from './components/Layout';

function App() {
    const { user, loading, error, login, logout, isAuthenticated, hasModule } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Cargando...</div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Layout user={user} onLogout={logout} hasModule={hasModule}>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ? (
                                <Navigate to="/dashboard" replace />
                            ) : (
                                <LoginPage onLogin={login} error={error} />
                            )
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <Dashboard user={user} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/pos"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="pos">
                                    <PosPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/kds"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="kds">
                                    <KdsPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/caja"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="caja">
                                    <CajaPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/inventario"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="inventario">
                                    <InventarioPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/proveedores"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="proveedores">
                                    <ProveedoresPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/reportes"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="reportes">
                                    <ReportesPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/catalogos"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="catalogos">
                                    <CatalogosPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/catalogos/:slug"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="catalogos">
                                    <CatalogoDetallePage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/productos"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={hasModule} moduleKey="productos">
                                    <ProductosPage />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/usuarios"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <ModuleRoute hasModule={() => user?.role === 'Administrador'} moduleKey="usuarios">
                                    <UsuariosPage user={user} />
                                </ModuleRoute>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ajustes"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                <SettingsPage user={user} onLogout={logout} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
                        }
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

export default App;
