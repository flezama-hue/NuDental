# Entornos y nube

| Entorno | Uso | Estado |
|---|---|---|
| Local | Programar en la laptop | Frontend 3000, API 3001 y PGlite en disco preparados. |
| Local con PostgreSQL | Validar SQL cliente/servidor | Compose incluido; requiere Docker y repetir comprobaciones allí. |
| Pruebas compartidas | Validación del jefe y compañeros | Pendiente de cuenta, permisos y despliegue. |
| Producción | Operación clínica real | Pendiente; este paquete no publica una nube. |

GitHub coordina el código. La nube ejecuta el backend y conserva base/archivos. Subir el repositorio no publica automáticamente la aplicación. GitHub Pages no ejecuta este backend Node/PostgreSQL.

## Empezar local

Usa `.env.example`, `DB_DRIVER=pglite`; ejecuta db:migrate, db:seed y dev en ese orden. La base queda en `.local-data/nudental` fuera de Git. Los datos de tu laptop no se comparten con tus compañeros. Para datos comunes se necesita un entorno de pruebas; no subir la base a GitHub.

## Alternativa PostgreSQL 17 con Docker

1. Instala e inicia Docker Desktop. Detén `npm run dev`.
2. Define `DB_DRIVER=postgres` y `POSTGRES_PASSWORD` en `.env`.
3. Define `DATABASE_URL=postgresql://nudental_local:TU_CLAVE@127.0.0.1:5432/nudental_local` con esa misma clave. Si tiene caracteres reservados de URL deben codificarse; una clave local aleatoria alfanumérica simplifica el arranque.
4. Ejecuta `docker compose up -d db` y espera a que esté saludable.
5. Ejecuta `npm run db:migrate`, `npm run db:seed`, `npm run dev`.
6. Detén con `docker compose stop db` sin borrar datos. Evita `down -v` si quieres conservar el volumen.

Se crea una base distinta de PGlite, sin transferencia automática de datos. El servicio solo escucha en 127.0.0.1. El usuario propietario local no debe ser el usuario de aplicación en producción.

## Decisiones de nube

Inventariar Google Cloud: proyecto, facturación, servicios, permisos y responsable. Google Cloud sí es nube; “GSP” podría significar “GCP”, pendiente de confirmar. AWS es alternativa, no un requisito de React.

Arquitectura requerida para cualquiera de los dos: hosting de frontend con HTTPS, API administrada, PostgreSQL administrado, almacenamiento privado de archivos, secretos del servidor, registros/alertas y respaldo. La elección debe comparar recursos existentes, experiencia del equipo y costo total; aquí no se cotiza ni se contrata infraestructura.

La hipótesis de 1.500 dentistas/30.000 casos al mes no acredita concurrencia soportada. Antes de salir se requiere prueba de carga, restauración y límites medidos.

## Configuración

| Variable | Propósito |
|---|---|
| DB_DRIVER / PGLITE_PATH | Motor y carpeta local. |
| DATABASE_URL | Conexión privada al servidor SQL; nunca usar prefijo VITE_. |
| APP_ORIGIN | URL exacta del frontend permitida para cambiar datos. |
| LOCAL_DEMO_PASSWORD | Clave para crear usuarios ficticios; no se sube. |
| POSTGRES_PASSWORD | Inicialización de Docker local; no se sube. |
| NODE_ENV | Modo de ejecución; pglite y seed rechazan production. |

Antes de un entorno compartido: confirmar responsable, recursos, URL HTTPS, variables, permisos SQL limitados, respaldo, monitoreo y reversión. El servidor entregado escucha en 127.0.0.1: requiere preparar un despliegue, no exponer el proceso local a Internet.
