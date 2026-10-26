# Frontend y contrato API v0.1

El contrato API acuerda qué dirección usa la pantalla, qué envía, qué recibe y qué errores maneja. Archivo legible por herramientas: `contracts/openapi.json`.

| Método y ruta implementada | Resultado |
|---|---|
| GET /api/health | Estado y consulta mínima a base. |
| POST /api/auth/login | Verifica email/password y devuelve usuario + cookie. |
| GET /api/auth/me | Identidad o 401 si no hay sesión vigente. |
| POST /api/auth/logout | JSON vacío; 204 y revocación en servidor. |
| GET /api/patients | Lista de clínica; limit (1-100) y offset. |
| POST /api/patients | Crea paciente; 201 o 409 por código duplicado. |
| GET /api/patients/{id} | Paciente autorizado o 404. |

Para cambiar datos se requiere `Content-Type: application/json` y `Origin` igual a APP_ORIGIN. El navegador envía el origen. Cliente: `credentials: same-origin`; cookie pasa por el proxy Vite.

Ejemplo de alta:

```json
{"name":"Paciente ficticio","birthDate":"1998-04-20","gender":"Otro","internalId":"A-001"}
```

No se envían clínica, rol ni autor: salen de la sesión. Se rechazan campos adicionales.

```json
{"error":{"code":"INVALID_INPUT","message":"Revisa nombre, código interno y género."}}
```

Errores: 400 entrada; 401 sesión; 403 rol/origen; 404 no accesible/ruta pendiente; 409 duplicado; 415 formato; 429 límite de intentos; 500 fallo interno sin detalles SQL.

## Próximas rutas

Con `x-implemented: false`: edición de pacientes; catálogo; casos y detalle; confirmación de órdenes con idempotencia; carga privada; transiciones; comentarios; versiones de diseños y revisión; registro de pagos. Si se llaman hoy, devuelven 404. Sus esquemas son borradores que el equipo debe cerrar antes de desarrollar cada módulo.

`Workspace.tsx` contiene el módulo conectado. `App.tsx` conserva la maqueta en /#demo. Cada módulo se conecta y prueba antes de sustituir su simulación. Se retiró del acceso demo la afirmación HIPAA que no tenía evidencia.

Siguiente cambio recomendado: edición de pacientes, catálogo y sus pruebas; después casos enlazados mediante patientId. Una modificación de estado de React por sí sola no acredita persistencia.
