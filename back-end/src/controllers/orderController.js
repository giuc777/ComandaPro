function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

async function getOrderStatus(pool, id) {
    const rows = await pool.query('SELECT status FROM orders WHERE id = ?', [Number(id)]);
    return rows?.[0]?.status || null;
}

// Convierte una senyal SQLSTATE 45000 de los procedimientos en respuesta HTTP.
// Devuelve true si ya respondio (404 si el registro no existe, 409 en el resto).
function sendSignal(res, error) {
    if (error?.sqlState !== '45000') return false;
    const message = error.sqlMessage || error.message || 'Operacion no permitida';
    const notFound = message === 'Mesa no encontrada' || message === 'Orden no encontrada';
    res.status(notFound ? 404 : 409).json({ error: message });
    return true;
}

const ORDER_STATUSES = ['pausada', 'pagada', 'anulada', 'enviada', 'preparando', 'lista', 'completada'];

function toDbModifiers(value) {
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
}

function toDbLabels(value) {
    if (value === null || value === undefined || value === '') return null;
    return Array.isArray(value) ? value.join(', ') : String(value);
}

// Sincroniza los items de una orden con el payload del cliente:
// - item_id existente -> UPDATE (conserva sent, sent_at y prepared_at)
// - sin item_id       -> INSERT (sent = 0, el KDS lo marca NUEVO)
// - ausente en payload -> DELETE
async function reconcileOrderItems(conn, orderId, items) {
    const existing = await conn.query('SELECT id FROM order_items WHERE order_id = ?', [orderId]);
    const existingIds = new Set((existing || []).map(row => Number(row.id)));
    const keepIds = new Set();

    for (const item of items) {
        const itemId = item.item_id != null ? Number(item.item_id) : null;
        const values = [
            Number(item.quantity),
            Number(item.unit_price),
            toDbModifiers(item.modifiers),
            toDbLabels(item.modifier_labels),
            item.notes || null
        ];

        if (itemId && existingIds.has(itemId)) {
            keepIds.add(itemId);
            await conn.query(
                `UPDATE order_items SET quantity = ?, unit_price = ?, modifiers = ?, modifier_labels = ?, notes = ?
                 WHERE id = ? AND order_id = ?`,
                [...values, itemId, orderId]
            );
            continue;
        }

        const insertResult = await conn.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, modifiers, modifier_labels, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, Number(item.product_id), ...values]
        );
        keepIds.add(Number(insertResult.insertId));
    }

    for (const itemId of existingIds) {
        if (keepIds.has(itemId)) continue;
        await conn.query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [itemId, orderId]);
    }
}

export function createOrderController(pool) {
    return {

        async createOrder(req, res) {
            const { table_id, customer_name, mode = 'mesa', notes, items = [] } = req.body;
            const created_by = req.user?.id || null;
            const customer = (customer_name || '').trim() === '' ? null : customer_name.trim();

            let conn;
            try {
                conn = await pool.getConnection();
                await conn.beginTransaction();

                const [result] = await conn.query(
                    'CALL sp_create_parked_order(?, ?, ?, ?, ?)',
                    [table_id || null, customer, mode, notes || null, created_by]
                );
                const orderId = Number(result[0].order_id);

                for (const item of items) {
                    await conn.query(
                        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, modifiers, modifier_labels, notes)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            orderId,
                            Number(item.product_id),
                            Number(item.quantity) || 1,
                            Number(item.unit_price),
                            item.modifiers ? JSON.stringify(item.modifiers) : null,
                            item.modifier_labels || null,
                            item.notes || null
                        ]
                    );
                }

                await conn.query('CALL sp_recalculate_order_totals(?)', [orderId]);
                await conn.commit();

                res.status(201).json({
                    order_id: orderId,
                    status: 'pausada',
                    table_id: table_id || null,
                    customer_name: customer,
                    mode,
                    notes: notes || null,
                    message: `Orden #${orderId} pausada`
                });
            } catch (error) {
                console.error('Error in createOrder:', error.message);
                if (conn) await conn.rollback();
                if (sendSignal(res, error)) return;
                res.status(500).json({ error: 'Error del servidor' });
            } finally {
                if (conn) conn.release();
            }
        },

        async listOrders(req, res) {
            try {
                const status = req.query.status || 'pausada';
                const statuses = String(status)
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => ORDER_STATUSES.includes(s));

                if (statuses.length === 0) {
                    return res.status(400).json({ error: 'status invalido' });
                }

                let result = [];
                if (statuses.length === 1 && statuses[0] === 'pausada') {
                    [result] = await pool.query('CALL sp_list_parked_orders()');
                } else {
                    for (const item of statuses) {
                        const [rows] = await pool.query('CALL sp_list_orders_by_status(?)', [item]);
                        result.push(...rows);
                    }
                }
                res.json(toJSON(result));
            } catch (error) {
                console.error('Error in listOrders:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getOrder(req, res) {
            try {
                const { id } = req.params;
                const result = await pool.query('CALL sp_get_order(?)', [Number(id)]);

                const orderRows = result[0];
                const itemRows = result[1] || [];

                if (!orderRows || orderRows.length === 0) {
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }

                const order = toJSON(orderRows[0]);
                order.items = toJSON(itemRows);

                res.json(order);
            } catch (error) {
                console.error('Error in getOrder:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async addOrderItem(req, res) {
            try {
                const { id } = req.params;

                const { product_id, quantity = 1, unit_price, modifiers, modifier_labels, notes } = req.body;

                const [result] = await pool.query(
                    'CALL sp_add_order_item(?, ?, ?, ?, ?, ?, ?)',
                    [
                        Number(id),
                        Number(product_id),
                        Number(quantity),
                        Number(unit_price),
                        modifiers ? JSON.stringify(modifiers) : null,
                        modifier_labels || null,
                        notes || null
                    ]
                );

                const itemId = Number(result[0].item_id);
                res.status(201).json({ item_id: itemId });
            } catch (error) {
                console.error('Error in addOrderItem:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.sqlMessage || error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteOrderItem(req, res) {
            try {
                const { id, itemId } = req.params;
                const rows = await pool.query(
                    `SELECT oi.id, oi.sent, o.status
                     FROM order_items oi
                     JOIN orders o ON o.id = oi.order_id
                     WHERE oi.id = ? AND oi.order_id = ?`,
                    [Number(itemId), Number(id)]
                );

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                const item = rows[0];
                if (item.status === 'pagada' || item.status === 'anulada') {
                    return res.status(409).json({ error: 'No se pueden editar items de una orden pagada o anulada' });
                }
                if (Number(item.sent) === 1) {
                    return res.status(409).json({ error: 'El item ya fue enviado a cocina y no se puede eliminar' });
                }

                await pool.query('CALL sp_delete_order_item(?)', [Number(itemId)]);
                await pool.query('CALL sp_recalculate_order_totals(?)', [Number(id)]);
                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteOrderItem:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.sqlMessage || error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateOrder(req, res) {
            const { id } = req.params;
            const { table_id, customer_name, mode = 'mesa', notes, items } = req.body;
            const customer = (customer_name || '').trim() === '' ? null : customer_name.trim();

            if (Array.isArray(items)) {
                for (const item of items) {
                    const productId = Number(item?.product_id);
                    const unitPrice = Number(item?.unit_price);
                    const quantity = Number(item?.quantity);
                    if (!Number.isInteger(productId) || productId <= 0) {
                        return res.status(400).json({ error: 'Item invalido: product_id requerido' });
                    }
                    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                        return res.status(400).json({ error: 'Item invalido: unit_price invalido' });
                    }
                    if (!Number.isInteger(quantity) || quantity < 1) {
                        return res.status(400).json({ error: 'Item invalido: quantity debe ser mayor a 0' });
                    }
                    if (item.item_id != null && !Number.isInteger(Number(item.item_id))) {
                        return res.status(400).json({ error: 'Item invalido: item_id invalido' });
                    }
                }
            }

            let conn;
            try {
                const currentStatus = await getOrderStatus(pool, id);
                if (!currentStatus) {
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }
                if (currentStatus === 'pagada' || currentStatus === 'anulada') {
                    return res.status(409).json({ error: 'No se puede editar una orden pagada o anulada' });
                }
                // Cabecera (sin items): editable por cualquier rol con modulo pos en
                // cualquier estado no pagado (regla de la sub-fase H).
                // Reemplazo de items: solo Administrador, o cualquier rol si esta pausada.
                if (Array.isArray(items) && req.user?.role !== 'Administrador' && currentStatus !== 'pausada') {
                    return res.status(409).json({ error: 'Solo se pueden reemplazar los items de una orden pausada' });
                }

                conn = await pool.getConnection();
                await conn.beginTransaction();

                const locked = await conn.query(
                    'SELECT status FROM orders WHERE id = ? FOR UPDATE',
                    [Number(id)]
                );
                const lockedStatus = locked?.[0]?.status;
                if (!lockedStatus) {
                    await conn.rollback();
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }
                if (lockedStatus === 'pagada' || lockedStatus === 'anulada') {
                    await conn.rollback();
                    return res.status(409).json({ error: 'Estado no editable' });
                }
                if (Array.isArray(items) && req.user?.role !== 'Administrador' && lockedStatus !== 'pausada') {
                    await conn.rollback();
                    return res.status(409).json({ error: 'Solo se pueden reemplazar los items de una orden pausada' });
                }

                await conn.query(
                    'CALL sp_reopen_order(?, ?, ?, ?, ?)',
                    [Number(id), table_id || null, customer, mode, notes || null]
                );

                await conn.query(
                    'UPDATE orders SET updated_by = ? WHERE id = ?',
                    [req.user?.id || null, Number(id)]
                );

                if (Array.isArray(items)) {
                    await reconcileOrderItems(conn, Number(id), items);
                }

                await conn.query('CALL sp_recalculate_order_totals(?)', [Number(id)]);
                await conn.commit();
                res.json({ success: true, order_id: Number(id) });
            } catch (error) {
                console.error('Error in updateOrder:', error.message);
                if (conn) await conn.rollback();
                if (sendSignal(res, error)) return;
                res.status(500).json({ error: 'Error del servidor' });
            } finally {
                if (conn) conn.release();
            }
        },

        async voidOrder(req, res) {
            try {
                const { id } = req.params;
                const voided_by = req.user?.id || null;
                const [result] = await pool.query('CALL sp_void_order(?, ?)', [Number(id), voided_by]);

                if (Number(result[0].affected) === 0) {
                    return res.status(409).json({ error: 'No se puede anular una orden pagada o anulada' });
                }
                res.json({ success: true });
            } catch (error) {
                console.error('Error in voidOrder:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async sendToKitchen(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_send_to_kitchen(?)', [Number(id)]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in sendToKitchen:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.sqlMessage || error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async listTables(req, res) {
            try {
                const [rows] = await pool.query('CALL sp_list_tables()');
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listTables:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateTableStatus(req, res) {
            try {
                const id = Number(req.params.id);
                const status = req.body?.status;

                if (!Number.isInteger(id) || id <= 0) {
                    return res.status(400).json({ error: 'Id de mesa invalido' });
                }
                if (status !== 'free' && status !== 'occupied') {
                    return res.status(400).json({ error: 'Estado invalido: use free u occupied' });
                }

                const [rows] = await pool.query('CALL sp_update_table_status(?, ?)', [id, status]);
                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in updateTableStatus:', error.message);
                if (sendSignal(res, error)) return;
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
