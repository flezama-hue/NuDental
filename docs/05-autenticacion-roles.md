# Autenticación, roles y aislamiento

Autenticación: quién eres. Autorización: qué puedes hacer y sobre qué datos. Ocultar un botón no sustituye la verificación del servidor.

## Flujo implementado

1. Correo/clave llegan desde un origen permitido.
2. El servidor verifica scrypt con sal aleatoria; no guarda contraseña en texto plano.
3. Crea un token aleatorio; solo su hash queda en SQL. La cookie HttpOnly dura 8 horas.
4. Cada ruta protegida consulta sesión, usuario activo y rol/clínica del servidor.
5. Cada consulta de pacientes filtra por clínica. Un paciente ajeno por ID responde 404.
6. Logout borra la sesión: la cookie antigua queda inválida.

Cookie SameSite=Lax; Secure en production; localhost usa HTTP. No hay token en localStorage. Se revisa Origin en cambios y se limita el JSON.

| Acción | clinic_admin | dentist | lab_manager | lab_technician |
|---|---|---|---|---|
| Login/logout y consultar identidad | Sí | Sí | Sí | Sí |
| Alta/lista/consulta de pacientes de su clínica | Sí | Sí | No | No |
| Consultar paciente de otra clínica | No | No | No | No |
| Cambiar roles por pantalla | Pendiente | Pendiente | Pendiente | Pendiente |
| Operar casos/diseños | Pendiente | Pendiente | Pendiente | Pendiente |

Laboratorio tendrá acceso solo a casos asignados y a la información necesaria. Esa bandeja aún no está implementada; no se concede acceso global a pacientes.

## Límites

- Sin registro público, recuperación de contraseña, invitación de usuarios del aplicativo, MFA ni SSO.
- Límite local: 10 intentos/15 minutos por IP y correo; requiere almacenamiento compartido con múltiples instancias.
- Una pertenencia por usuario; multiclínica requiere ampliar el modelo.
- Pruebas de aislamiento cubren pacientes; cada ruta futura necesita pruebas propias.
- Sin políticas RLS; requiere usuario SQL limitado, revisión técnica, auditoría y respaldo antes de producción.
- Tablas de casos no equivalen a reglas de estados implementadas.

Las cuentas del aplicativo y GitHub son distintas: invitar a un compañero al repositorio no lo registra como dentista.
