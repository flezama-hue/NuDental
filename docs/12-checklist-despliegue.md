# Checklist antes de desplegar NuDental

Fecha de consolidación: 26 de octubre de 2026.

## Verificación técnica

- [ ] `npm ci` finaliza con el `package-lock.json` del repositorio.
- [ ] `npm run check` ejecuta TypeScript, pruebas de integración y compilación.
- [ ] La migración `001 → 002` se prueba sobre una copia de staging.
- [ ] Se crea un respaldo antes de aplicar migraciones a una base compartida.
- [ ] El aislamiento entre clínicas y los permisos por rol se revisan con cuentas ficticias.
- [ ] No existen credenciales, datos clínicos ni comprobantes reales en GitHub.

## Vista 1 — odontólogo y clínica

- [ ] Crear una referencia clínica y un caso.
- [ ] Confirmar catálogo, precio, forma de pago y dirección.
- [ ] Enviar y recibir mensajes durante el caso.
- [ ] Revisar una versión exacta del diseño y registrar la decisión formal.
- [ ] Registrar un pago para conciliación.
- [ ] Consultar seguimiento, calidad, despacho y entrega.

## Vista 2 — administración NuDental

- [ ] Revisar y actualizar casos autorizados.
- [ ] Publicar avance indicando si es medido, estimado o no disponible.
- [ ] Registrar control de calidad.
- [ ] Conciliar pagos y revisar crédito.
- [ ] Gestionar inventario, reservas, movimientos, proveedores y compras.
- [ ] Preparar, despachar y confirmar entregas.
- [ ] Emitir la factura administrativa solo después de la entrega.

## Integraciones pendientes de proveedor

- [ ] Contrato y credenciales del MRP.
- [ ] SDK/API y pruebas reales de PANDA P3 Plus.
- [ ] Almacenamiento privado y URLs temporales.
- [ ] Proveedor, consentimiento y plantillas aprobadas de WhatsApp.
- [ ] Conector local para máquinas que tengan una interfaz documentada.
- [ ] Proveedor autorizado para facturación fiscal.

## Despliegue

- [ ] Separar variables y bases de desarrollo, staging y producción.
- [ ] Usar PostgreSQL administrado en producción; no PGlite.
- [ ] Mantener workers e integraciones persistentes fuera de funciones efímeras.
- [ ] Migrar el frontend a Next.js/Vercel por recorridos, después de congelar el contrato de API.
- [ ] Ejecutar prueba de carga con el volumen piloto antes de entregar acceso a odontólogos.
