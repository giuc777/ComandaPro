import { useState, useCallback } from 'react';
import { api } from '../api/apiClient';

const TAX_RATE = 0.12;

const emptyOrder = {
    orderId: null,
    tableId: null,
    tableName: null,
    customerName: '',
    mode: 'mesa',
    notes: '',
    items: [],
    isLoaded: false
};

export function useOrder() {
    const [order, setOrder] = useState(emptyOrder);

    const addItem = useCallback((product, modifiers = [], modifierLabels = '', quantity = 1) => {
        const unitPrice = product.finalPrice !== undefined ? product.finalPrice : Number(product.price);
        const item = {
            tempId: Date.now() + Math.random(),
            product_id: product.id,
            product_name: product.name,
            product_image: product.image,
            quantity,
            unit_price: unitPrice,
            modifiers,
            modifier_labels: modifierLabels,
            notes: ''
        };
        setOrder(prev => ({ ...prev, items: [...prev.items, item] }));
        return item;
    }, []);

    const updateQuantity = useCallback((tempId, newQty) => {
        if (newQty < 1) return;
        setOrder(prev => ({
            ...prev,
            items: prev.items.map(i => i.tempId === tempId ? { ...i, quantity: newQty } : i)
        }));
    }, []);

    const removeItem = useCallback((tempId) => {
        setOrder(prev => ({ ...prev, items: prev.items.filter(i => i.tempId !== tempId) }));
    }, []);

    const setTable = useCallback((tableId, tableName) => {
        setOrder(prev => ({ ...prev, tableId, tableName }));
    }, []);

    const setCustomerName = useCallback((name) => {
        setOrder(prev => ({ ...prev, customerName: name }));
    }, []);

    const setMode = useCallback((mode) => {
        setOrder(prev => ({ ...prev, mode }));
    }, []);

    const setNotes = useCallback((notes) => {
        setOrder(prev => ({ ...prev, notes }));
    }, []);

    const loadOrder = useCallback((orderData) => {
        const items = orderData.items.map(item => ({
            ...item,
            tempId: `loaded-${item.id}-${Date.now()}`,
            product_name: item.product_name,
            product_image: item.product_image,
            unit_price: Number(item.unit_price),
            modifiers: item.modifiers || [],
            modifier_labels: item.modifier_labels || ''
        }));
        setOrder({
            orderId: orderData.id,
            tableId: orderData.table_id,
            tableName: orderData.table_name,
            customerName: orderData.customer_name || '',
            mode: orderData.mode || 'mesa',
            notes: orderData.notes || '',
            items,
            isLoaded: true
        });
    }, []);

    const reset = useCallback(() => {
        setOrder(emptyOrder);
    }, []);

    const computeTotals = useCallback(() => {
        const subtotal = order.items.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;
        return {
            subtotal: Number(subtotal.toFixed(2)),
            tax: Number(tax.toFixed(2)),
            total: Number(total.toFixed(2))
        };
    }, [order.items]);

    const hasItems = order.items.length > 0;

    async function saveOrder() {
        const payloads = order.items.map(i => ({
            product_id: Number(i.product_id),
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            modifiers: i.modifiers,
            modifier_labels: i.modifier_labels || null,
            notes: i.notes || null
        }));

        const data = {
            table_id: order.tableId || null,
            customer_name: (order.customerName || '').trim() || null,
            mode: order.mode,
            notes: order.notes || null,
            items: payloads
        };

        if (order.orderId) {
            return api.updateOrder(order.orderId, data);
        }
        return api.createOrder(data);
    }

    return {
        order,
        addItem,
        updateQuantity,
        removeItem,
        setTable,
        setCustomerName,
        setMode,
        setNotes,
        loadOrder,
        reset,
        computeTotals,
        hasItems,
        saveOrder
    };
}
