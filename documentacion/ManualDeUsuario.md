# Manual de Usuario - ComandaPro / DeerCoffee

Manual practico para usar el sistema punto de venta (POS) de DeerCoffee.
Esta guia describe la interfaz tal como aparece en pantalla.

> **Nota:** la interfaz no usa acentos en los textos (ej. "Contrasena",
> "Ordenes"). En este manual se respeta ese texto exacto cuando se cita un
> boton o etiqueta de la pantalla.

---

## Contenido

1. [Introduccion](#1-introduccion)
2. [Inicio de sesion](#2-inicio-de-sesion)
3. [Roles y permisos](#3-roles-y-permisos)
4. [Dashboard](#4-dashboard)
5. [Ventas POS](#5-ventas-pos)
6. [Caja (turnos)](#6-caja-turnos)
7. [Cobro de una orden](#7-cobro-de-una-orden)
8. [Productos](#8-productos)
9. [Inventario](#9-inventario)
10. [Proveedores](#10-proveedores)
11. [Catalogos](#11-catalogos)
12. [Reportes](#12-reportes)
13. [Usuarios (Administrador)](#13-usuarios-administrador)
14. [Ajustes](#14-ajustes)
15. [Cocina KDS](#15-cocina-kds)
16. [Preguntas frecuentes](#16-preguntas-frecuentes)

---

## 1. Introduccion

ComandaPro es un sistema de punto de venta para cafeterias. Permite registrar
ventas por mesa o para llevar, controlar caja y turnos, administrar productos,
inventario y proveedores, y consultar reportes.

**Acceso:** abrir el navegador en la direccion del servidor (por ejemplo
`http://<ip_de_la_raspberry>/`). Se recomienda Chrome o Edge actualizados.

**Zona horaria:** las fechas y horas de ventas y reportes usan la zona horaria
`America/Guatemala`.

---

## 2. Inicio de sesion

1. Abrir la direccion del sistema en el navegador.
2. Completar **Nombre de usuario** y **Contrasena**.
3. Presionar **Iniciar Sesion** (el boton muestra *Iniciando sesion...* mientras
   procesa).
4. Aparece el aviso **Sesion iniciada correctamente** y se redirige al
   Dashboard.

**Validaciones del formulario:**

- Usuario vacio: `Este campo es obligatorio`.
- Contrasena vacia: `Contrasena requerida`.

**Errores de acceso:**

| Mensaje | Significado |
|---------|-------------|
| `Credenciales incorrectas` | Usuario o contrasena no coinciden |
| `Cuenta bloqueada. Intenta de nuevo en X minuto(s)` | Se superaron los intentos fallidos |
| `Cuenta desactivada` | El administrador desactivo la cuenta |

**Bloqueo por seguridad:** al 5to intento fallido la cuenta se bloquea
automaticamente durante 15 minutos. El administrador puede desbloquearla desde
**Usuarios** (ver seccion 13).

**Cerrar sesion:** icono de salida en la parte inferior del menu lateral, o
boton **Cerrar Sesion** en Ajustes.

---

## 3. Roles y permisos

El sistema tiene 3 roles. Cada rol ve en el menu lateral solo los modulos para
los que tiene permiso.

| Modulo | Administrador | Barista | Cajero |
|--------|:---:|:---:|:---:|
| Dashboard | Si | Si | Si |
| Ventas POS | Si | Si | Si |
| Caja | Si | Si | Si |
| Ajustes | Si | Si | Si |
| Cocina KDS | Si | Si | No |
| Productos | Si | No | No |
| Inventario | Si | No | No |
| Proveedores | Si | No | No |
| Catalogos | Si | No | No |
| Reportes | Si | No | No |
| Usuarios | Si | No | No |

- Los permisos se pueden ajustar por rol desde **Usuarios > Permisos por Rol**
  (solo administrador). El rol Administrador siempre tiene acceso total.
- Si intentas abrir una pagina sin permiso, el sistema te devuelve al Dashboard.
- El servidor responde `Modulo no disponible para tu rol` si se accede por
  direccion directa.

---

## 4. Dashboard

Pantalla de inicio tras iniciar sesion (`/dashboard`).

**Encabezado:**
- Saludo segun la hora: **Buenos dias**, **Buenas tardes** o **Buenas noches**,
  seguido del nombre del usuario.
- Estado del turno: **Turno Abierto • estacion** o **Sin turno abierto**.
  Si no hay turno se muestra el boton **Abrir turno** (lleva a Caja).
- Icono de notificaciones con contador rojo si hay insumos con stock bajo
  (al hacer clic abre Inventario).

**Tarjeta Ventas Hoy:**
- Monto total de ventas del dia.
- **Ordenes**: cantidad de ordenes del dia.
- **En cola**: ordenes pendientes.
- **Ticket prom.**: promedio por orden.

**Accesos rapidos:**
- **Nueva Venta** (POS)
- **Mi Cocina** (KDS)
- **Inventario**
- **Reportes** (solo Administrador)

**Alerta Stock Critico:** franja que lista los productos con stock bajo y
boton **Ver** para abrir Inventario.

**Grafico:** **Ventas Ultimos 7 Dias** con la tendencia de la semana.

**Ordenes Activas:** lista de ordenes en curso con enlace **Ver POS**. Cada
fila muestra `#id`, mesa o **Para Llevar**, nombre del cliente, numero de
items, antiguedad y hora. Si no hay ordenes: **No hay ordenes activas**.

---

## 5. Ventas POS

Pantalla para registrar ventas (`/pos`).

### 5.1 Encabezado

- **Volver** (regresa al Dashboard).
- Etiqueta **Orden** con el nombre actual: nombre de cliente, `Orden #id` o
  **Nueva Orden**.
- Reloj con la hora actual.
- Selector de modo de la orden.

### 5.2 Modo de orden

Dos botones en la parte superior:

- **En Mesa** (por defecto): consumo en el local; requiere elegir mesa.
- **Para Llevar**: pedido para llevar; se identifica por nombre de cliente.

### 5.3 Barra de control

- **Mesa / Seleccionar mesa**: abre el modal **Seleccionar Mesa**.
  - Muestra todas las mesas en una cuadricula con su nombre, capacidad
    (`N pers.`) y estado: **Libre** (verde) u **Ocupada** (rojo).
  - Cada mesa tiene un candado para **cambiar el estado a mano**
    (🔓 marcar ocupada / 🔒 marcar libre). Si la mesa tiene una orden
    activa el sistema responde con un aviso y no la libera.
  - La mesa elegida se marca con un check y queda en el boton.
  - Se cierra con la tecla `Escape`, con el icono de cierre o al elegir una
    mesa.
  - Si no hay mesas: **No hay mesas disponibles**.
- **Nombre de cliente (opcional)**: identifica la orden (obligatorio en modo
  Para Llevar si no hay mesa).
- Campo de notas con el placeholder **Notas...** (ej. "sin azucar").

### 5.4 Elegir productos

1. Filtrar por categoria con los chips de la parte superior (el primero es
   **Todos**).
2. Hacer clic en un producto del catalogo:
   - Si no tiene modificadores, se agrega directamente al ticket.
   - Si tiene modificadores, se abre un modal con el nombre del producto y el
     titulo **Personaliza tu orden**.
3. En el modal de modificadores:
   - Los grupos marcados **Requerido** deben elegirse.
   - **Max N** indica el maximo de opciones del grupo; **Opcion unica** permite
     solo una.
   - Cada opcion muestra su ajuste de precio (`+Q...` o `-Q...`); el total se
     recalcula en pantalla.
4. Presionar **Agregar** para confirmar, o **Cancelar** para descartar.

Si una categoria no tiene productos: **No hay productos en esta categoria**.

### 5.5 Ticket Actual

Encabezado **Ticket Actual** con el conteo `N productos · N unidades`.

- Sin productos: **Agrega productos al ticket**.
- Cada linea muestra nombre, modificadores (con estrella), precio unitario y:
  - Botones **-** y **+** para cambiar cantidad (minimo 1).
  - Icono de papelera **Eliminar** para quitar la linea.
- Totales: **Subtotal**, **IVA (12%)** y **Total**.

### 5.6 Pausar la orden

Boton **Pausar Orden** (debajo del ticket):

1. Guarda la orden con estado `pausada`.
2. Muestra el aviso `Orden <nombre> pausada`.
3. Limpia el ticket y refresca las ordenes pausadas.

Validaciones:
- `Agrega productos al ticket primero` (ticket vacio).
- `Ingresa nombre de cliente o selecciona mesa` (falta identificacion).

### 5.7 Ordenes pausadas

Panel **Órdenes Pausadas** con contador. Cada tarjeta muestra el cliente o
`Orden #id`, el tiempo transcurrido y el total.

- **Retomar**: vuelve a cargar la orden en el ticket para seguirla editando.
- **Cobrar**: abre la pantalla de cobro (ver seccion 7).
- **Anular**: pide confirmacion con el titulo **Anular orden** y el mensaje
  *¿Seguro que deseas anular la orden #ID? Esta acción no se puede deshacer.*
  y confirma con **Anular orden**. No se puede anular una orden ya pagada.

Sin ordenes: **No hay ordenes pausadas**.

### 5.8 Flujo resumido

```
Elegir modo (En Mesa / Para Llevar)
        ↓
Seleccionar mesa y/o nombre de cliente + notas
        ↓
Agregar productos (con modificadores si aplica)
        ↓
Ajustar cantidades en el ticket
        ↓
Pausar Orden   (o ir directo a Cobrar)
        ↓
Panel de pausadas: Retomar / Cobrar / Anular
```

---

## 6. Caja (turnos)

Pantalla de caja (`/caja`). Tiene dos estados: **sin turno abierto** y
**con turno abierto**.

### 6.1 Abrir turno (sin turno)

1. Ingresar el **Efectivo Inicial** (caja chica; por defecto `200`).
2. Presionar **Abrir Caja** (muestra *Abriendo...*).

Validaciones:
- El efectivo inicial es obligatorio (`start_cash es requerido`).
- Solo puede existir un turno abierto a la vez.

Pantalla **Sin Turno** / **Sin turno activo** con los indicadores en cero.

### 6.2 Vista con turno abierto

- Cabecera **Caja**, `Turno #ID · Estacion` y el distintivo
  **Turno #ID Abierto** (al hacer clic abre el arqueo).
- Tarjeta con cajero, hora de inicio, efectivo inicial, antiguedad del turno y
  cantidad de transacciones.
- Indicadores: **Efectivo**, **Tarjeta**, **QR**, **Ingresos**, **Egresos** y
  bloque **Total del turno (ventas)** con el desglose de ingresos (`+`) y
  egresos (`-`) manuales.
- Botones:
  - **Ingresar** (icono `+`) -> abre el modal para registrar un ingreso.
  - **Retirar** (icono `-`) -> abre el modal para registrar un egreso.
  - **Cerrar Turno** (icono de candado) -> abre el arqueo.
  - **Movimientos del turno**: lista de transacciones del turno actual, que se
    actualiza sola cada 15 segundos. Sin movimientos: **Sin movimientos
    registrados**.
  - **Turnos Anteriores**: ultimos 5 turnos cerrados con cajero, fecha,
    cantidad de transacciones, total y diferencia (+/- contra el esperado).
  - **Volver al Dashboard**.

### 6.3 Arqueo de caja

Modal **Arqueo de Caja** al presionar **Cerrar Turno** o el distintivo de turno:

1. Se muestra el **Efectivo esperado** (efectivo inicial + ventas en efectivo
   + ingresos en efectivo - egresos en efectivo), con el desglose de cada parte.
2. Contar billetes y monedas en **Conteo de Denominaciones**: Q100, Q50, Q20,
   Q10, Q5, Q1, Q0.50 y Q0.25. Cada fila calcula su subtotal.
3. Revisar:
   - **Total contado**: suma de lo ingresado.
   - **Diferencia**: se etiqueta como **Sobrante** (verde, sobro dinero) o
     **Faltante** (rojo, falta dinero).
4. Presionar **Cerrar Turno** (muestra *Cerrando...*) o **Cancelar** para no
   cerrar.

### 6.4 Detalle de un movimiento

Al hacer clic en cualquier transacción se abre **Detalle del movimiento** con:

- Mesa, Cliente, Cajero, Fecha y Hora.
- Items (`N x producto`) con sus modificadores.
- **Subtotal**, **IVA 12%** (solo si se aplico) y **Total**.
- Metodo de pago (Efectivo / Tarjeta / QR), monto **Recibido** y **Cambio**.
- Boton **Reimprimir** para volver a imprimir el recibo. Estados:
  *Imprimiendo...* -> **Impreso**, o **Error - Reintentar**.
- Boton **Cerrar** (tambien con `Escape`).

> Para ver movimientos de un turno cerrado, usar **Turnos Anteriores** y elegir
> **Turno #ID** (se abre el historial con el detalle de cada transaccion).

### 6.5 Ingresos y egresos manuales

Con el turno abierto, los botones **Ingresar** y **Retirar** registran
movimientos que no vienen de una venta:

- **Ingreso** (verde, `+`): propina, aporte u otro dinero que entra a caja.
  Admite **Efectivo**, **Tarjeta** o **QR**.
- **Egreso** (rojo, `-`): retiro de efectivo para comprar ingredientes u otro
  gasto. Solo admite **Efectivo** (el resto de metodos queda deshabilitado).

En el modal **Registrar ingreso / Registrar egreso**:

1. Escribir el **Monto** (debe ser mayor a cero).
2. Elegir el **Metodo**.
3. Escribir el **Concepto** (obligatorio) o usar una sugerencia rapida
   (*Propina*, *Compra de ingredientes*, etc.).
4. Presionar **Registrar ingreso / Registrar egreso**.

Los movimientos aparecen en **Movimientos del turno** con su etiqueta
**Ingreso**/**Egreso** y el concepto, y actualizan los indicadores y el
**Efectivo esperado** del arqueo.

> Requiere un turno abierto (si no, la respuesta es 409: *No hay un turno de
> caja abierto*). El concepto no puede quedar vacio y un egreso siempre es en
> efectivo.

---

## 7. Cobro de una orden

Se accede desde el POS con **Cobrar** en una orden pausada (abre
`/caja?order=id`).

### 7.1 Estados previos

| Situacion | Mensaje |
|-----------|---------|
| Orden ya pagada | `Esta orden ya fue cobrada` (+ **Volver al POS**) |
| Sin turno de caja | `No hay un turno de caja abierto` con el texto *Debes abrir caja antes de registrar un cobro.* y boton **Abrir Caja** |

### 7.2 Registrar el pago

1. Revisar el resumen: monto a pagar, chip **Mesa X** o **Para llevar**, e
   items con modificadores.
2. **IVA:** la casilla **Aplicar IVA 12%** activa o desactiva el impuesto. Por
   defecto viene desactivado.
3. Elegir el metodo de pago: **Efectivo**, **Tarjeta** o **QR**.
   - **Efectivo:** ingresar el **Recibido**; el sistema calcula **Cambio:** y
     muestra *El monto recibido es menor al total* si no alcanza. Botones
     rapidos para monto exacto o redondeos (Q...).
   - **Tarjeta** o **QR:** se registran aqui el pago; la cobranza fisica se
     realiza en la terminal. La pantalla indica: *El pago con tarjeta/QR se
     registra aqui. El cobro real se realiza en la terminal fisica.*
4. Presionar **Cobrar Q X.XX**. Si faltan condiciones, el boton dice
   **Abre caja para cobrar** y queda deshabilitado.

### 7.3 Recibo y cierre

Al pagar se abre el recibo **DeerCoffee** (*Un cafe con historia*) con orden,
items, subtotal, IVA, total, pago y cambio, mas la nota *La venta queda
registrada. Puede finalizar cuando el cliente haya salido.*

- **Imprimir**: envia el recibo a la impresora (*Imprimiendo...* ->
  *Impreso* o *Error - Reintentar*).
- **Finalizar venta**: regresa al POS. La mesa ya quedo **libre** al
  registrar el pago (solo tiene dos estados: libre u ocupada).

---

## 8. Productos

Pantalla **Productos** (solo Administrador).

- Cabecera: **{n} productos activos** y boton **Nuevo Producto**.
- Tarjetas KPI: **Productos**, **Categorias**, **Con imagen**.
- Filtros por categoria (chips **Todos** + cada categoria).
- Tabla: **Producto**, **Categoria**, **Precio**, **Costo**, **Receta**
  (conteo de insumos o aviso rojo **Sin receta**), **Badge** y **Acciones**
  (iconos **Editar** y **Desactivar**).

### 8.1 Crear o editar producto

Modal **Nuevo Producto** / **Editar Producto** con:

- **Nombre \*** (ej. *Latte Vainilla*), **Categoria** (opciones, incluye
  **Sin categoria**), **Precio \***, **Costo**, **Descripcion**, **Badge**
  (texto destacado: Popular, Nuevo, Top Seller) y **Orden**.
- **Receta / Insumos \***: seccion obligatoria. Boton **Agregar insumo** y por
  cada fila: **Seleccionar insumo**, cantidad y unidad.
  - *Todo producto requiere insumos (insumo -> receta -> producto).*
  - Validaciones: **Agrega al menos un insumo para guardar el producto**,
    **No puedes repetir un insumo en la receta**, **El nombre es requerido**,
    **El precio debe ser mayor a 0**, **Agrega al menos un insumo con cantidad
    mayor a 0**.
- **Imagen del producto**: **Seleccionar imagen** / **Quitar imagen**.
  Formato *JPG, PNG, WEBP. Max 5MB.*

Botones: **Cancelar** y **Guardar** / **Crear Producto**.

Mensajes de exito: **Producto creado** / **Producto actualizado**.

### 8.2 Desactivar producto

Icono **Desactivar** -> confirmacion **Desactivar producto** con el texto
*¿Desactivar "X"? Dejará de aparecer en el menú y el punto de venta.* -> boton
**Desactivar**. El producto deja de verse en el POS (**Producto desactivado**).

> Los modificadores (tamanos, leches, extras) no se gestionan aqui sino en
> Catalogos (seccion 11).

---

## 9. Inventario

Pantalla **Inventario** (solo Administrador), con **{n} insumos activos** y
boton **Nuevo**. Tiene dos pestanas: **Insumos** y **Recetas**.

### 9.1 Pestana Insumos

- KPIs: **Valorizacion** (valor total del inventario), **Criticos** (insumos
  bajo el minimo) y la casilla **Solo criticos** para filtrar.
- Tabla: **Insumo**, **Stock** (editable: se guarda al salir del campo),
  **Minimo**, **Costo/Unidad**, **Estado** (chip **Critico** o **OK**) y
  **Acciones** (eliminar).
- Boton **Nuevo** abre **Nuevo Insumo**: **Nombre**, **Unidad** (kg, litros,
  ml, piezas), **Costo/Unidad**, **Stock inicial**, **Stock minimo** ->
  **Crear** / **Cancelar**.
- Eliminar: confirmacion **Eliminar insumo** con *¿Eliminar este insumo del
  inventario? Esta acción no se puede deshacer.* -> **Eliminar**.
  Si el insumo se usa en recetas: `No se puede eliminar: tiene recetas activas`.

### 9.2 Pestana Recetas

- Seleccionar un producto de la lista (**Selecciona un producto para
  ver/editar su receta**).
- Se muestra **Receta: {producto}** con **Costo declarado** (el costo del
  producto) y **Costo receta** (suma de ingredientes; en rojo si supera al
  declarado).
- Boton **Agregar** para un ingrediente: **Ingrediente**, **Cantidad**,
  **Unidad** -> **Guardar** / **Cancelar**.
- Tabla: **Ingrediente**, **Cantidad**, **Stock**, **Costo linea** y
  **Accion** (quitar con confirmacion **Quitar ingrediente**).

Mensajes: **Ingrediente guardado**, **Ingrediente eliminado**.

> La receta es la que descuenta stock automaticamente al cobrar una venta.

---

## 10. Proveedores

Pantalla **Proveedores** (solo Administrador), con **Nuevo**, KPIs **Activos**
y **Total**, y tarjetas con nombre, contacto, estado **Activo**, telefono y
correo. Sin datos: **Sin proveedores**.

### 10.1 Proveedor

- Boton **Nuevo** -> modal **Nuevo Proveedor** / **Editar Proveedor** con
  **Nombre**, **Contacto**, **Telefono**, **Email**, **Direccion** y
  **Notas** -> **Crear** / **Actualizar**.
- Mensajes: **Proveedor creado**, **Proveedor actualizado**.

### 10.2 Ordenes de compra

Al entrar al proveedor se ve **Ordenes de Compra** con boton **Nueva Orden**.
Cada orden es una tarjeta **PO #id** con estado (**Pendiente**, **Recibida** o
**Cancelada**), cantidad de items, total y fecha.

Dentro de la orden:
- Agregar lineas con **Insumo**, **Cant.**, **Costo** -> **OK**.
- **Recibir** (verde): pide confirmacion *¿Recibir esta orden de compra? Se
  agregará el stock al inventario.* y suma el stock (**Orden recibida**).
- Icono de cancelar: confirmacion *¿Cancelar esta orden de compra? Esta acción
  no se puede deshacer.* (**Orden cancelada**).
- **Quitar item** de una linea con su propia confirmacion.

---

## 11. Catalogos

Pantalla **Catalogos** (solo Administrador) con **{n} grupos activos** y boton
**Nuevo Grupo**.

- KPIs: **Grupos**, **Total Items**, **Ultima edicion**.
- Tarjetas por grupo con nombre, etiqueta **Modificador** (grupos que aportan
  opciones al POS), descripcion, conteo de items y enlace **Ver**.
- Sin grupos: **No hay grupos de catalogo. Crea el primero.**

### 11.1 Grupos

Modal **Nuevo Grupo** / **Editar Grupo**: **Nombre**, **Slug**, casilla
**Grupo de modificadores (POS)** (al activarla aparecen **Requerido** y
**Max selecciones**), **Descripcion**, **Icono** y **Color**.

Grupos disponibles: *Categorias de Producto*, *Tipos de Bebida*, *Tamanos*,
*Metodos de Preparacion*, *Ingredientes Principales*, *Mesas*, etc.

### 11.2 Items de un grupo

Dentro de **Ver** se listan los items. Botones **Nuevo Item** y, si es
modificador, **Asignar productos**.

- Tabla: **Item**, **Icono**, **Color**, **Orden**; para el grupo `mesas`
  agrega **Cap.** y **Estado** (chips **Libre** / **Ocupada**); para
  modificadores agrega **Ajuste** (`+$X` o `-$X`).
- Modal **Nuevo Item** / **Editar Item**: **Nombre**, **Descripcion**,
  **Icono**, **Color**, **Orden**, y segun el grupo: **Capacidad**
  (*Personas por mesa/espacio*) o **Ajuste de precio** (*Positivo = mas caro,
  negativo = mas barato*). En mesas, la edicion agrega **Estado**
  (**Libre** / **Ocupada**); no deja liberar una mesa con orden activa.
- Desactivar: confirmacion **Desactivar item**.

### 11.3 Asignar modificadores a productos

Boton **Asignar productos** -> modal **Asignar productos al grupo** con el
texto *Selecciona los productos que tendran este grupo de modificadores:*, la
lista de productos con casillas, y botones **Cancelar** / **Guardar**
(**Asignacion guardada**).

---

## 12. Reportes

Pantalla **Reportes & Finanzas** (`/reportes`), **solo Administrador**. Sin
permiso aparece **Acceso restringido** con el texto *Solo los administradores
pueden acceder a los reportes y finanzas.* y boton **Volver al inicio**.

- Cabecera: titulo, distintivo **En Vivo**, subtitulo **Inteligencia
  Operativa** y boton **Exportar**.
- Filtros de periodo: **Hoy**, **Ayer**, **Esta semana**, **Este mes**.
- Tarjeta **Ventas del Periodo** con el total y el desglose: **Efectivo**,
  **Tarjeta**, **QR** y **Trans.** (numero de transacciones).
- KPIs: **Transacciones**, **Ticket Promedio**, **Efectivo**, **Tarjeta + QR**.
- Comparativas: **Hoy vs Ayer** y **Semana vs Anterior**, con porcentaje de
  variacion (verde si sube, rojo si baja).
- Graficos:
  - **Tendencia de Ventas**: ventas en el periodo.
  - **Ventas por Hora**: barras de 6:00 a 23:00.
  - **Ventas por Categoria**: distribucion en dona.
- **Top Productos**: top 10 con unidades e ingresos (los 3 primeros
  resaltados).
- **Cierre de Caja**: ultimos 5 turnos cerrados con cajero, fecha, ventas,
  transacciones y diferencia; enlace **Ver caja**.

---

## 13. Usuarios (Administrador)

Pantalla **Usuarios** (`/usuarios`), visible solo para Administrador. Tiene
tres secciones.

### 13.1 Sucursal

- Campo con el nombre de la sucursal y boton **Guardar**.
- Mensajes: **Sucursal actualizada** / **Error al actualizar**.

### 13.2 Usuarios

- Boton **Nuevo** -> modal **Nuevo Usuario**: **Nombre**, **Username**,
  **Email**, **Contraseña** (minimo 8 caracteres) y **Rol** (Barista, Cajero,
  Administrador) -> **Crear**.
- Por cada fila aparecen las acciones (tooltip):
  - **Editar** -> modal **Editar Usuario** -> **Guardar**.
  - **Cambiar contraseña** -> modal **Cambiar Contraseña** -> **Actualizar**.
  - **Desbloquear**: libera una cuenta bloqueada por intentos fallidos.
  - **Desactivar** / **Activar**: modal **Desactivar usuario** -> boton
    **Desactivar**. No puedes desactivarte a ti mismo.
- Errores comunes: `El username ya existe`, `La contraseña debe tener al
  menos 8 caracteres`, `No puedes desactivarte a ti mismo`.

### 13.3 Permisos por Rol

Matriz de permisos por modulo y rol (Administrador, Barista, Cajero) con
interruptores para habilitar o deshabilitar el acceso de cada rol a cada
modulo. El rol Administrador no se puede deshabilitar.

> Ver la tabla de permisos por defecto en la seccion 3.

---

## 14. Ajustes

Pantalla **Ajustes** (`/ajustes`), titulo **Ajustes & Perfil**.

1. **Perfil**: avatar con iniciales, nombre, chip con el rol, sucursal y
   estado **En linea**. Campos informativos **Email** y **Sucursal**.
2. **Cambiar Contrasena**: campos **Contrasena actual**, **Nueva contrasena** y
   **Confirmar**, con boton **Actualizar** (muestra *Actualizando...*).
   Validaciones: **Todos los campos son obligatorios**,
   **Las contrasenas no coinciden**, **Minimo 8 caracteres**. Exito:
   **Contrasena actualizada**. Error de contrasena actual: *Contraseña actual
   incorrecta*.
3. **Cerrar Sesion**: cierra la sesion y regresa al login.

---

## 15. Cocina KDS

Pantalla **KDS Cocina** (`/kds`) con el distintivo **Próximamente**: el modulo
de cocina aun no esta implementado.

Flujo actual sin KDS: en el POS las ordenes se **pausan** con nombre de cliente
y mesa, se listan en el panel de pausadas y se cobran manualmente.

Unico boton: **Ir al POS**.

---

## 16. Preguntas frecuentes

### Errores de acceso

| Mensaje | Causa | Solucion |
|---------|-------|----------|
| `Este campo es obligatorio` / `Contrasena requerida` | Campos vacios | Completar usuario y contrasena |
| `Credenciales incorrectas` | Datos mal escritos | Verificar usuario/contrasena (mayusculas) |
| `Cuenta bloqueada...` | 5 intentos fallidos | Esperar 15 min o pedir al administrador que desbloquee |
| `Cuenta desactivada` | Cuenta inactiva | Pedir al administrador que la reactive |

### Ventas y caja

| Mensaje | Causa | Solucion |
|---------|-------|----------|
| `Agrega productos al ticket primero` | Ticket vacio al pausar | Agregar al menos un producto |
| `Ingresa nombre de cliente o selecciona mesa` | Orden sin identificar | Escribir nombre o elegir mesa |
| `No hay un turno de caja abierto` | Caja cerrada | Abrir caja con efectivo inicial |
| `start_cash es requerido` | Efectivo inicial vacio | Ingresar el monto del fondo |
| `Esta orden ya fue cobrada` | Orden pagada | Volver al POS |
| `El monto recibido es menor al total` | Efectivo insuficiente | Ajustar el monto recibido |
| `No se puede anular una orden pagada o anulada` | Orden ya cobrada | La anulacion no aplica |

### Impresion

| Mensaje | Causa | Solucion |
|---------|-------|----------|
| `Impresora deshabilitada` | Impresion apagada | Activar `PRINTER_ENABLED` en el servidor |
| `Error - Reintentar` | Sin conexion a la impresora | Revisar cable/red e intentar de nuevo |

### Inventario y productos

| Mensaje | Causa | Solucion |
|---------|-------|----------|
| `Sin receta` en la tabla | Producto sin insumos | Editar el producto y agregar insumos |
| `No se puede eliminar: tiene recetas activas` | Insumo en uso | Quitarlo antes de las recetas que lo usan |
| `El username ya existe` | Username duplicado | Elegir otro username |

### Dudas frecuentes

- **¿Donde veo las ventas del dia?** Dashboard (**Ventas Hoy**) y Reportes
  (**Hoy**).
- **¿Como libero una mesa?** Se libera sola al **cobrar** o al **anular** la
  orden; si hace falta, cambiala a *Libre* con el candado del selector de
  mesas (POS) o en **Catalogos > Mesas > Editar > Estado**. Mientras tenga
  una orden activa el sistema no deja liberarla (aviso 409).
- **¿Y si no hay turno de caja?** Abrir caja en Caja con el efectivo inicial
  antes de cobrar.
- **¿Se cobra IVA siempre?** No; el IVA 12% se aplica marcando la casilla
  **Aplicar IVA 12%** en la pantalla de cobro.
- **¿Donde cambio mi contrasena?** En **Ajustes > Cambiar Contrasena** (o el
  administrador desde **Usuarios**).
- **¿Quien puede ver reportes?** Solo el rol Administrador.
- **¿Como quito un producto de la carta?** Desactivarlo desde **Productos**
  (deja de aparecer en el POS).

---

> Para la conexion de la impresora termica, ver [print.md](print.md).
> Para el arranque y la base de datos, ver [Up.md](Up.md).
> Para instalar en Raspberry Pi, ver [../Deploy/README.md](../Deploy/README.md).
