export default function Dashboard({ user, onLogout }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-amber-900">
                        ComandaPro
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                            Hola, {user.name}
                        </span>
                        <button
                            onClick={onLogout}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Panel de control</h2>
                    <p className="text-gray-600">
                        Bienvenido al sistema de punto de venta para cafetería especializada.
                    </p>
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-800">
                            <strong>Rol:</strong> {user.role}
                        </p>
                        <p className="text-sm text-amber-800">
                            <strong>Sucursal:</strong> {user.sucursal}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
