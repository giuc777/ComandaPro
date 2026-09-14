# Database - ComandaPro

## Estructura

- `01_create_tables.sql` - Script de creación de tablas
- `02_seed_data.sql` - Datos semilla (usuarios, productos, inventario, etc.)

## Ejecución

```bash
# Conectar a MariaDB
mariadb -u root -p

# Ejecutar scripts
SOURCE 01_create_tables.sql;
SOURCE 02_seed_data.sql;
```

## Diagrama de Tablas

```
users ─────────┐
               │
orders ────────┼── order_items ──── products ──── recipes ──── inventory
               │
payments ──────┘
               
shifts ──────── shift_transactions

suppliers (independiente)

tables (independiente, se conecta con orders)
```
