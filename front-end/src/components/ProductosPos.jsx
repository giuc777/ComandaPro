import { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import ModifierModal from './ModifierModal';

export default function ProductosPos({ onAddProduct, selectedCategory, onCategorySelect }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalProduct, setModalProduct] = useState(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [prods, cats] = await Promise.all([
                    api.getProducts(selectedCategory || undefined),
                    api.getCategories()
                ]);
                setProducts(prods);
                setCategories([{ id: '', name: 'Todos' }, ...cats]);
            } catch {
                setProducts([]);
                setCategories([{ id: '', name: 'Todos' }]);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [selectedCategory]);

    async function handleProductClick(product) {
        try {
            const modifierRows = await api.getProductModifiers(product.id);
            if (modifierRows && modifierRows.length > 0) {
                setModalProduct(product);
            } else {
                onAddProduct(product, [], '', Number(product.price));
            }
        } catch {
            onAddProduct(product, [], '', Number(product.price));
        }
    }

    function handleModifiersConfirm(modifierIds, price, labels) {
        onAddProduct(modalProduct, modifierIds, labels, price);
        setModalProduct(null);
    }

    return (
        <>
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-3 mb-4 overflow-x-auto">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => onCategorySelect(cat.id || null)}
                            className={`chip ${selectedCategory === cat.id || (!selectedCategory && !cat.id) ? 'active' : ''}`}
                            data-testid={`cat-${cat.id || 'all'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined text-primary text-[28px] animate-spin">progress_activity</span>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px] mb-2">local_cafe</span>
                    <p className="text-sm">No hay productos en esta categoria</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {products.map(product => (
                        <button
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-3 text-center cursor-pointer hover:shadow-md hover:border-primary-container/40 transition-all group text-left"
                            data-testid={`product-${product.id}`}
                        >
                            {product.image ? (
                                <img
                                    src={api.getUploadUrl(product.image)}
                                    alt={product.name}
                                    className="w-14 h-14 rounded-lg object-cover mx-auto mb-2"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-surface-container mx-auto mb-2 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[22px] text-on-surface-variant">local_cafe</span>
                                </div>
                            )}
                            <span className="font-semibold text-[0.8125rem] text-on-surface block truncate">{product.name}</span>
                            <span className="font-display text-sm font-bold text-primary block mt-1">
                                Q{Number(product.price).toFixed(2)}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {modalProduct && (
                <ModifierModal
                    productId={modalProduct.id}
                    productName={modalProduct.name}
                    basePrice={Number(modalProduct.price)}
                    onConfirm={handleModifiersConfirm}
                    onClose={() => setModalProduct(null)}
                />
            )}
        </>
    );
}
