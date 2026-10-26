# Migración controlada a Next.js y Vercel

## Decisión de esta rama

La rama 0.2 desarrolla primero el dominio funcional sobre la base existente React/Vite + Express. Convertir simultáneamente el framework, la base de datos, los permisos, las rutas y toda la interfaz aumentaría el riesgo y dificultaría saber si un error pertenece al negocio o a la migración.

La API, migraciones y pruebas se escribieron sin depender del navegador actual. Por ello pueden conservarse al pasar a Next.js.

## Arquitectura objetivo

```text
Next.js en Vercel
  ├─ portal clínico
  ├─ administración
  └─ BFF / rutas autenticadas
       ↓ HTTPS privado
API NuDental / workers (Cloud Run u otro runtime persistente)
       ├─ PostgreSQL administrado
       ├─ almacenamiento de objetos
       ├─ cola de notificaciones
       ├─ conector MRP
       └─ conector local del laboratorio
```

Vercel no debe conectarse directamente por USB, Modbus o red local a máquinas. El conector del laboratorio inicia conexiones HTTPS salientes y conserva una cola local cuando no hay internet.

## Secuencia recomendada

1. Congelar el contrato de `/api` con las pruebas de esta rama.
2. Crear `apps/web` en Next.js sin modificar la API.
3. Migrar autenticación y shell visual.
4. Migrar Vista 1 por recorridos: resumen, lista, creación, detalle, mensajes, aprobación, pagos.
5. Migrar Vista 2: casos, inventario, logística, finanzas, clientes, compras e integración.
6. Ejecutar las mismas pruebas de aceptación contra ambos frontends.
7. Sustituir Vite solo después de obtener paridad funcional.
8. Desplegar preview, staging y producción con bases y secretos separados.

## Qué no debe ir a Vercel

- PGlite de producción;
- archivos clínicos dentro del repositorio o filesystem efímero;
- claves de PANDA, WhatsApp o MRP expuestas al navegador;
- conexión directa a máquinas;
- workers que necesiten ejecución continua dentro de una función corta;
- credenciales compartidas entre staging y producción.
