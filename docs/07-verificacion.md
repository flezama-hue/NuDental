# Verificación de la entrega v0.1

Preparación: 05/10/2026 (Lima). Estas comprobaciones corresponden a esta copia del código, no a una publicación en GitHub o nube.

## Resultados ejecutados

| Comprobación | Resultado | Qué demuestra |
|---|---|---|
| `npm ci` | Correcto | Las dependencias se instalan desde el archivo de versiones `package-lock.json`. |
| `npm run lint` | Correcto | TypeScript no detectó errores de tipos. Este comando no revisa estilo. |
| `npm test` | 14 casos funcionales correctos | La suite comprueba identidad, permisos, datos e integridad. El ejecutor cuenta además la prueba contenedora: 15 en el resumen. |
| `npm run build` | Correcto, con aviso de tamaño | El frontend se compila. El archivo JavaScript principal supera 500 kB; separar módulos es una optimización pendiente. |
| Migración y datos ficticios | Correcto | `db:migrate` y `db:seed` crean la base local y las cuatro cuentas documentadas. |
| Arranque completo y reinicio | Correcto | Se iniciaron API y Vite; se comprobó salud por el proxy, inicio de sesión, alta de paciente, respuesta HTML y lectura del paciente después de detener y reiniciar ambos procesos. |

La salida de la comprobación está en [evidence/automated-check.txt](evidence/automated-check.txt). El arranque se probó mediante peticiones HTTP desde un script; no es una prueba visual del navegador.

## Los 14 casos funcionales

1. Contraseña incorrecta rechazada sin crear cookie.
2. Credenciales válidas, cookie HttpOnly/SameSite y rol definido por el servidor.
3. Acceso sin sesión o con token inventado rechazado.
4. Paciente guardado y recuperado con su fecha.
5. Clínica B no lista ni consulta por ID pacientes de A.
6. El cliente no puede elegir clínica ni rol en el cuerpo de la solicitud.
7. Los roles de laboratorio no consultan el directorio de pacientes.
8. Código interno duplicado rechazado dentro de la misma clínica; permitido en otra.
9. Fecha inválida, ID inválido y origen externo rechazados.
10. La clave foránea compuesta impide asociar un caso con un paciente de otra clínica.
11. Una sesión vencida no permite acceso.
12. Cerrar sesión invalida el token en el servidor.
13. Los intentos reiterados de inicio de sesión se limitan.
14. La base escrita en disco conserva datos al cerrar y abrir el motor.

## Límites de la verificación

- Entorno ejecutado: Linux y Node.js 24; no se ha ejecutado esta copia en la laptop Windows del usuario.
- Motor probado: PGlite. La alternativa PostgreSQL mediante Docker no se ejecutó.
- No se ha comprobado visualmente la interfaz en navegador. Compilar y obtener HTML no demuestra que todos los controles se rendericen o funcionen correctamente.
- No se ha desplegado en nube, configurado un dominio, creado un repositorio remoto ni enviado invitaciones.
- La verificación de tipos y estas pruebas no equivalen a una auditoría de seguridad, carga o aceptación clínica.
- Casos, órdenes, archivos, diseños, pagos y chat siguen pendientes de integración; sus pantallas de demostración no acreditan funcionamiento real.

## Comprobación manual en tu computadora

Usa únicamente datos ficticios y registra resultado, fecha y evidencia.

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| Arrancar según README y abrir `http://localhost:3000` | Aparece el inicio de sesión | Pendiente |
| Entrar con dentista A | Se muestra su clínica y pacientes | Pendiente |
| Crear paciente y recargar | El registro permanece | Pendiente |
| Detener con Ctrl+C, iniciar otra vez y entrar | El registro permanece | Pendiente |
| Cerrar sesión y entrar con dentista B | No aparece el paciente de A | Pendiente |
| Entrar con laboratorio | No tiene acceso al directorio de pacientes | Pendiente |
| Abrir `/#demo` y volver | La simulación está identificada y se puede regresar | Pendiente |

Al subirlo, comprueba que GitHub Actions termine correctamente. Si el equipo reporta un problema, crea un issue con pasos, resultado esperado, resultado real y captura sin datos sensibles.
