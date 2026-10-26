# Pruebas de aceptación de las vistas 1 y 2

La prueba automatizada `server/tests/api.test.ts` levanta una base PGlite aislada, aplica migraciones, crea usuarios ficticios e inicia la API en un puerto temporal.

## Recorridos cubiertos

- autenticación, cookies y rechazo de origen externo;
- aislamiento entre clínicas;
- creación y consulta de referencias clínicas;
- catálogo, precio, orden y evento para MRP;
- acceso del laboratorio asignado;
- mensajes compartidos frente a notas internas;
- archivo de diseño, versión y aprobación formal;
- seguimiento con origen y clase de porcentaje;
- calidad aprobada y retrabajo;
- pago enviado, conciliación administrativa y saldo;
- preparación, despacho y entrega;
- factura posterior a la entrega;
- inventario, reserva y protección contra saldo inválido;
- proveedores y orden de compra;
- permisos de clientes y precios;
- persistencia de la base local.

## Ejecución

```bash
npm ci
npm run check
```

`npm run check` ejecuta TypeScript, pruebas de integración y compilación de la interfaz. GitHub Actions repite la misma verificación con Node 24 en cada `push` y `pull_request`.

## Criterio antes de fusionar

- workflow verde;
- revisión visual de ambos roles;
- ninguna credencial o dato real en el repositorio;
- migración 001 → 002 comprobada en una copia de staging;
- respaldo antes de aplicar en una base compartida;
- aprobación del contrato de integración por el equipo MRP.
