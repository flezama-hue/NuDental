# Entregables de planificación y preparación

Preparación: 05/10/2026 (Lima). Versión inicial para aprobación, sin horas reales imputadas.

| Actividad en la captura | Fechas de la captura | Entrega concreta | Estado reportable |
|---|---|---|---|
| Alcance, arquitectura y planificación | 01/10 - 01/10 | docs/01: alcance, arquitectura, alternativas, secuencia e hitos | Elaborado ahora; pendiente de aceptación. |
| Modelo ER y base de datos | 02/10 - 07/10 | docs/02 y database/001_initial.sql | Modelo y migración ejecutable; reglas por validar con clínica/laboratorio. |
| Entornos de nube y repositorio | 05/10 - 05/10 | docs/03, configuración local, Docker opcional, guía de GitHub | Local preparado; nube/remoto requieren accesos y creación. |
| Base del frontend y contrato API | 01/10 - 05/10 | Frontend conservado, módulo conectado, contracts/openapi.json | Base local y contrato v0.1; otros módulos siguen simulados. |
| Autenticación, roles y aislamiento | 06/10 - 08/10 | server/app.ts, SQL de usuarios/sesiones y pruebas | Base local adelantada; no es aprobación de producción. |

Ninguna actividad se marca como aceptada por el jefe. La fila de autenticación aún no vence al corte del 05/10. La captura termina esa fila el 08/10, pero el cronograma posterior excluía esa jornada: hay que conciliar esa fecha con el jefe.

## Dependencias para cerrar la preparación

| Acción | Responsable propuesto | Evidencia |
|---|---|---|
| Acordar dueño del nuevo repositorio | Freddy + responsable del trabajo | URL bajo cuenta/organización acordada. |
| Publicar código e invitar al equipo | Propietario del repositorio | Commit visible e invitaciones aceptadas. |
| Confirmar nube y recursos | Responsable de nube por asignar | Inventario de cuenta/proyecto, servicios, permisos y facturación. |
| Aprobar alcance y reglas de datos | Jefe + clínica/laboratorio | Acta con decisiones y exclusiones. |
| Confirmar apoyo y revisar complejidad | Jefe | Persona y disponibilidad; reestimación del 13/10. |
| Definir ruta PANDA | Diego/fabricante, por confirmar | Muestra exportada y documentación técnica. |

## Demostración al jefe

Inicia sesión, crea un paciente ficticio y recarga. Entra con otra clínica y verifica que no aparece el registro anterior. Muestra el ER y distingue rutas implementadas de propuestas. Reporta accesos pendientes con responsable y fecha.

El cronograma anterior conserva 230 h, tres fases y 15 entregables. Este paquete no modifica el Excel ni el dashboard: sirve como evidencia para actualizar su control después de la revisión.
