# NuDental: alcance implementado de las vistas 1 y 2

Versión de trabajo: 0.2 · 26 de octubre de 2026

## Decisión de arquitectura

NuDental desarrolla dos sistemas conectados sobre una identidad y una API comunes:

| Sistema | Responsable | Fuente de verdad |
|---|---|---|
| **1. Portal del odontólogo y la clínica** | Equipo NuDental | Casos solicitados, prescripciones, archivos, aprobaciones, conversación y confirmación de recepción. |
| **2. Administración NuDental** | Equipo NuDental | Clientes, precios, condiciones de pago, pagos conciliados, facturas, envíos, almacén, proveedores, compras, permisos y cola de integración. |
| **3. MRP del laboratorio** | Otro equipo | Validación técnica, planificación, técnicos, operaciones, máquinas, consumos, calidad productiva, reprocesos y disponibilidad productiva. |

NuDental **no escribe directamente en la base del MRP** y el MRP no escribe en la base de NuDental. Los intercambios se representan como eventos persistidos en `integration_outbox`; esto permite reintentos, auditoría e idempotencia.

## Vista 1: odontólogo / clínica

La interfaz conectada permite:

1. iniciar sesión con rol `dentist` o `clinic_admin`;
2. mantener referencias clínicas de pacientes dentro de su propia clínica;
3. consultar catálogo y precio vigente de la cuenta;
4. crear un caso con producto, material, color, pieza, cantidad, prescripción, prioridad, fecha, forma de pago, dirección y origen del escaneo;
5. consultar exclusivamente casos de la cuenta autenticada;
6. revisar estado productivo y financiero por separado;
7. conversar con el laboratorio durante todo el recorrido;
8. revisar y aprobar una versión concreta del diseño;
9. registrar evidencia o referencia de un pago para conciliación;
10. consultar calidad, despacho y entrega.

El texto escrito en un mensaje nunca sustituye una aprobación formal. La aprobación usa `design_versions`, registra versión, usuario, decisión y fecha.

## Vista 2: administración / laboratorio

La interfaz conectada permite:

- bandeja de casos asignados al laboratorio;
- actualización de estados comerciales y resumen de seguimiento;
- distinción entre porcentaje **medido**, **estimado** y **no disponible**;
- mensajes compartidos y notas internas;
- controles de calidad con resultado aprobado, rechazo o retrabajo;
- revisión y conciliación de pagos;
- clientes, crédito, modalidad predeterminada y plazos;
- listas de precios y tiempos de entrega;
- inventario, reservas, consumos, entradas, salidas y ajustes;
- proveedores y órdenes de compra;
- preparación, despacho, incidencia y entrega de envíos;
- emisión inicial de factura después de entrega confirmada;
- consulta de eventos pendientes para MRP, PANDA, almacenamiento o facturación.

El rol `lab_technician` opera casos, seguimiento, calidad, mensajes, almacén y logística. El rol `lab_manager` añade decisiones comerciales, precios, crédito, conciliación, facturas, proveedores, compras y administración de integraciones.

## Flujo vertical del piloto

```text
Clínica crea caso
  → NuDental calcula precio y condición comercial
  → evento case_submitted queda en cola para MRP
  → laboratorio valida y publica avance
  → conversación / aprobación formal de diseño
  → MRP produce y NuDental recibe el resumen
  → calidad aprobada
  → administración prepara envío y cobranza aplicable
  → despacho
  → entrega confirmada
  → factura o saldo pendiente según modalidad
```

## Tablas incorporadas en la migración 002

La migración agrega, sin borrar el modelo inicial:

- relación clínica–laboratorio;
- listas de precios por clínica;
- control de calidad;
- almacenes, ubicaciones, materiales y lotes;
- proveedores, compras y recepciones;
- movimientos y reservas de inventario;
- seguimiento resumido y asignaciones visibles;
- envíos y sus líneas;
- facturas y sus líneas;
- colas de notificación e integración;
- auditoría.

## Límites deliberados de esta entrega

Esta rama deja la estructura y los puntos de conexión, pero no afirma que ya exista una integración externa cuando falta el proveedor:

- **PANDA P3 Plus:** se registra `submission_source=panda` y existe la cola para eventos, pero falta SDK/API, credenciales y prueba con el equipo real.
- **WhatsApp:** la base soporta canal `whatsapp`; falta seleccionar proveedor, plantillas aprobadas, consentimiento y credenciales.
- **MRP:** la cola y contrato están definidos; falta que el otro equipo implemente consumidor, autenticación máquina a máquina y confirmaciones.
- **Archivos:** la API registra metadatos después de una carga privada; falta el adaptador definitivo de almacenamiento y URLs temporales.
- **Máquinas:** no se envían comandos remotos. El MRP o conector local debe acreditar una interfaz soportada por modelo.
- **Facturación fiscal:** la factura del piloto es administrativa. La emisión tributaria requiere proveedor autorizado y validación contable.
- **Next.js/Vercel:** se mantiene React/Vite + Express para completar y probar el dominio sin mezclar una migración de framework. El plan de transición está en `10-migracion-nextjs-vercel.md`.
