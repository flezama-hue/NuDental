# NuDental

Plataforma para coordinar casos entre clínicas odontológicas y un laboratorio dental digital.

Esta rama implementa el primer recorrido conectado de los **sistemas 1 y 2**:

- **Vista 1 — odontólogo / clínica:** pacientes o referencias clínicas, catálogo, creación de casos, seguimiento, conversación, aprobación de diseño, pagos y entrega.
- **Vista 2 — administración NuDental:** casos, clientes, precios, pagos, crédito, facturas, calidad, envíos, almacén, proveedores, compras y cola de integración.
- **Sistema 3 — MRP:** permanece a cargo del otro equipo. NuDental no duplica la planificación de máquinas ni la ejecución de producción.

> Estado: piloto técnico. Utiliza solo información ficticia hasta completar almacenamiento privado, seguridad de producción, acuerdos con proveedores e integración MRP.

## Qué funciona en esta versión

- sesión por cookie `HttpOnly` y control de roles;
- aislamiento de información por clínica y laboratorio;
- catálogo y precios por cuenta;
- caso con orden, forma de pago, anticipo y prioridad;
- mensajes compartidos y notas internas;
- metadatos de archivos y versiones de diseño;
- aprobación formal de una versión de diseño;
- seguimiento con progreso medido, estimado o no disponible;
- control de calidad;
- registro y conciliación de pagos;
- envíos y confirmación de entrega;
- clientes, crédito, precios y factura piloto;
- inventario, reservas, movimientos, proveedores y órdenes de compra;
- eventos persistidos para conectar MRP, PANDA, almacenamiento y facturación;
- auditoría y pruebas integradas.

## Inicio local

Requiere Node.js 24.

```bash
npm ci
cp .env.example .env
```

Define una contraseña ficticia de al menos 12 caracteres:

```env
LOCAL_DEMO_PASSWORD=CAMBIA_ESTA_CLAVE_LOCAL
```

Aplica el esquema y crea usuarios de demostración:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Abre `http://localhost:3000`.

### Cuentas ficticias

Todas usan la contraseña definida en `LOCAL_DEMO_PASSWORD`.

| Rol | Correo |
|---|---|
| Odontólogo clínica A | `dentista.a@example.test` |
| Odontólogo clínica B | `dentista.b@example.test` |
| Coordinación clínica A | `admin.a@example.test` |
| Técnico de laboratorio | `laboratorio@example.test` |
| Administración NuDental | `admin.laboratorio@example.test` |

## Base de datos

El desarrollo local usa PGlite de forma predeterminada. PostgreSQL completo está disponible mediante `compose.yaml`.

```bash
# PGlite
DB_DRIVER=pglite
PGLITE_PATH=./.local-data/nudental

# PostgreSQL
DB_DRIVER=postgres
DATABASE_URL=postgresql://nudental_local:TU_CLAVE@127.0.0.1:5432/nudental_local
```

Las migraciones se ejecutan en orden y se registran en `schema_migrations`:

- `001_initial.sql`: identidad, clínica, pacientes y modelo inicial de casos;
- `002_nudental_views_1_2.sql`: dominio funcional de las vistas 1 y 2.

Antes de aplicar la migración 002 a una base compartida, crea respaldo y verifica una copia de staging.

## Verificación

```bash
npm run check
```

El comando ejecuta:

1. revisión TypeScript;
2. pruebas de integración con base temporal;
3. compilación del frontend.

GitHub Actions repite esta verificación en cada `push` y `pull_request`.

## Arquitectura resumida

```text
React/Vite (piloto conectado)
        ↓ /api
Express + reglas de rol
        ↓
PostgreSQL / PGlite
   ├─ casos y conversación
   ├─ administración y logística
   ├─ inventario y compras
   ├─ auditoría
   └─ outbox de integración
        ↓
MRP / PANDA / WhatsApp / almacenamiento
(adaptadores pendientes de proveedor)
```

El frontend puede migrarse a Next.js sin reescribir el dominio. La secuencia está documentada en `docs/10-migracion-nextjs-vercel.md`.

## Documentación principal

- `docs/08-vistas-1-2.md`: responsabilidad exacta de cada sistema;
- `docs/09-integracion-mrp.md`: eventos e idempotencia;
- `docs/10-migracion-nextjs-vercel.md`: transición de frontend y despliegue;
- `docs/11-pruebas-aceptacion-vistas-1-2.md`: recorridos automatizados;
- `contracts/openapi-v0.2.yaml`: contrato inicial de la API.

## Límites de seguridad

- No subir `.env`, claves, comprobantes reales ni archivos clínicos al repositorio.
- PGlite es solo para desarrollo local.
- Los archivos se almacenarán en objetos privados y se servirán con acceso temporal.
- PANDA, WhatsApp y MRP requieren credenciales de servicio fuera del navegador.
- Vercel no se conectará directamente a USB, Modbus o máquinas del laboratorio.
- La factura del piloto no sustituye comprobantes tributarios.

Este paquete corresponde al proyecto autónomo **NuDental**, preparado para publicarse en un repositorio independiente. No incluye secretos, bases locales, `node_modules` ni artefactos de compilación.


## Publicación en un repositorio nuevo

El paquete incluye `scripts/publicar-en-github.ps1` y `scripts/publicar-en-github.sh`. Primero crea en GitHub un repositorio privado vacío llamado `NuDental`; después ejecuta el script correspondiente desde la raíz del proyecto. Consulta `TRANSFERENCIA_GITHUB.md` para el procedimiento completo y las comprobaciones posteriores.
