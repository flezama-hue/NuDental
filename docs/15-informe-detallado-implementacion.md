# Informe detallado de implementación y justificación

**Proyecto:** NuDental — Vistas 1 y 2  
**Versión:** 0.2.0  
**Fecha de consolidación:** 26 de octubre de 2026  
**Alcance:** portal del odontólogo/clínica y sistema administrativo NuDental  
**Sistema relacionado, fuera del alcance de desarrollo:** MRP del laboratorio

## 1. Resumen ejecutivo

Se transformó la base histórica del prototipo dental en un proyecto autónomo denominado **NuDental**, orientado a cubrir las dos vistas que corresponden al equipo: la Vista 1 para odontólogos y clínicas, y la Vista 2 para administración, logística, finanzas, almacén y coordinación con el laboratorio.

El resultado ya no es únicamente una maqueta visual. Se implementaron una API conectada, persistencia, autenticación, separación por clínica, permisos por rol, gestión de casos, conversación, aprobación formal de diseños, pagos, control de calidad, envíos, inventario, compras, auditoría y una bandeja de integración. También se añadió una migración incremental de base de datos, un contrato OpenAPI, documentación operativa y pruebas automatizadas.

La arquitectura conserva el MRP como Sistema 3 independiente. NuDental no intenta reemplazar su planificación detallada de máquinas, operaciones, tiempos, consumos o reprocesos. La comunicación se prepara mediante eventos persistentes e idempotentes, porque compartir directamente una base de datos crearía acoplamiento, riesgo de corrupción y dependencia entre equipos.

La verificación automatizada final se ejecutó en GitHub Actions con Node.js 24. Pasaron la revisión TypeScript, las pruebas de integración y la compilación de producción. El proyecto se limpió y reidentificó como `nudental-platform` versión `0.2.0`, eliminando archivos temporales utilizados durante la transferencia.

## 2. Situación inicial

La base recibida contenía una aplicación React/Vite con numerosas pantallas visuales y datos simulados. Existía una base local con autenticación y pacientes, pero la mayoría de los módulos —casos, órdenes, archivos, diseños, pagos, chat y administración— no estaban conectados a persistencia real.

Los principales problemas eran:

1. coexistencia entre una maqueta visual amplia y un módulo conectado muy reducido;
2. falta de rutas de API para los recorridos completos del odontólogo;
3. ausencia de una vista administrativa conectada;
4. modelo de datos inicial insuficiente para inventario, compras, envíos, facturas e integración;
5. falta de límites claros entre NuDental y el MRP;
6. denominación histórica K2/Nova en archivos y metadatos;
7. validación automática inicialmente fallida por cuatro errores de TypeScript;
8. ausencia de un paquete autónomo listo para un repositorio independiente.

## 3. Objetivo de la intervención

El objetivo fue producir una base técnica revisable y ejecutable para las Vistas 1 y 2, manteniendo una frontera explícita con el Sistema 3. Para ello se priorizaron cinco resultados:

- convertir los recorridos centrales en operaciones persistentes;
- proteger los datos por clínica, laboratorio y rol;
- dejar el dominio preparado para integraciones sin inventar APIs inexistentes;
- documentar las decisiones para que otro desarrollador pueda continuar;
- entregar un paquete autónomo, validado y publicable como nuevo proyecto NuDental.

## 4. Criterios de arquitectura

### 4.1 Separación de responsabilidades

Se definieron tres sistemas:

| Sistema | Responsabilidad principal | Fuente de verdad |
|---|---|---|
| Vista 1 — odontólogo y clínica | Solicitud del caso, prescripción, archivos, conversación, aprobación y consulta | NuDental |
| Vista 2 — administración | Clientes, precios, pagos, crédito, inventario, compras, envíos, facturas, permisos e integración | NuDental |
| Sistema 3 — MRP | Validación técnica, planificación, técnicos, operaciones, máquinas, consumos y reprocesos | MRP |

**Justificación:** cada sistema debe ser propietario de sus decisiones. Si NuDental gestionara directamente colas de máquinas y el MRP también lo hiciera, existirían estados contradictorios. Si el MRP modificara pagos o clientes, se mezclarían procesos técnicos con responsabilidades comerciales.

### 4.2 API y base de datos como núcleo estable

Se mantuvo temporalmente React/Vite + Express para terminar primero el dominio. La API, migraciones y pruebas no dependen del framework visual, por lo que el frontend podrá migrar a Next.js sin reescribir las reglas de negocio.

**Justificación:** cambiar al mismo tiempo framework, base, permisos, API y todas las pantallas dificultaría identificar la causa de cada error. La estrategia reduce riesgo y permite comparar el nuevo frontend con recorridos ya probados.

### 4.3 Integración mediante outbox

Los cambios que deben comunicarse a MRP, PANDA, almacenamiento o facturación se registran en `integration_outbox` con una clave de idempotencia.

**Justificación:** una llamada externa puede fallar después de guardar un caso. El patrón outbox evita perder el evento, permite reintentos y reduce duplicados. También facilita auditoría y conciliación.

### 4.4 Progreso verificable

El seguimiento diferencia avance `measured`, `estimated` y `unavailable`.

**Justificación:** un tiempo calculado por CAM no demuestra que una fresadora esté ejecutando; tampoco el fin de un ciclo equivale a calidad aprobada. Mostrar el origen del dato evita presentar estimaciones como mediciones.

## 5. Vista 1 — portal del odontólogo y la clínica

### 5.1 Autenticación y sesión

Se conectó el inicio de sesión a una API que verifica contraseña con scrypt y crea una sesión revocable almacenada en servidor. La cookie principal se denomina `nudental_session`, es `HttpOnly`, usa `SameSite=Lax` y se marca `Secure` en producción. Se conserva lectura temporal de la cookie histórica para facilitar migración.

**Justificación:** guardar tokens legibles por JavaScript elevaría el impacto de un ataque XSS. La sesión revocable permite cerrar acceso sin esperar a que expire un token autónomo.

### 5.2 Aislamiento por clínica

Las rutas clínicas obtienen `clinic_id` desde la sesión; el navegador no puede elegir autoritativamente otra clínica. Las consultas filtran por clínica y las claves foráneas compuestas impiden asociar pacientes y casos de cuentas diferentes.

**Justificación:** ocultar registros solo en la interfaz no es seguridad. La protección debe aplicarse en servidor y base de datos.

### 5.3 Pacientes y referencias clínicas

Se mantuvo el registro de pacientes/referencias bajo el control de la clínica, con código interno único por clínica, fecha de nacimiento y género. El laboratorio no recibe acceso irrestricto al directorio completo.

**Justificación:** el laboratorio necesita contexto suficiente para fabricar, pero no debe disponer de más información personal de la necesaria. El código interno permite relacionar el caso sin convertir a NuDental en sistema clínico completo.

### 5.4 Catálogo y precios

El portal consulta el catálogo vigente y el precio aplicable a la clínica. El producto incluye categoría, material predeterminado y plazo estimado.

**Justificación:** el precio mostrado debe proceder de una lista administrada, no de constantes en el frontend. Esto permite acuerdos por clínica y evita que un cambio futuro modifique pedidos ya aceptados.

### 5.5 Creación de casos

Se implementó un formulario conectado que registra:

- paciente o referencia;
- producto y material;
- color;
- pieza dental FDI;
- cantidad;
- título y prescripción;
- prioridad estándar o urgente;
- fecha solicitada;
- modalidad de pago;
- dirección de entrega;
- origen de información: manual, PANDA o escáner externo.

Al crear el caso se generan el pedido comercial, sus líneas, el seguimiento inicial, auditoría y el evento para integración.

**Justificación:** una sola transacción evita dejar un caso sin orden o una orden sin caso. El origen de escaneo se guarda desde el inicio para preparar la futura integración sin afirmar que ya existe.

### 5.6 Lista y detalle de casos

La clínica puede buscar y abrir únicamente sus casos. Se muestran por separado el estado productivo, el estado financiero, el saldo y la línea de tiempo.

**Justificación:** producción, calidad, pago, despacho y entrega son hechos distintos. Una sola etiqueta “completado” ocultaría bloqueos y generaría errores operativos.

### 5.7 Mensajería continua

Se añadió conversación vinculada al caso. Los mensajes conservan autor, rol, tipo, visibilidad, fecha y estado de lectura. La vista administrativa puede crear notas internas que no se muestran a la clínica.

**Justificación:** la comunicación fuera del caso —por WhatsApp personal o llamadas no registradas— pierde contexto. Mantener el historial permite transferir responsables y resolver incidencias sin borrar decisiones previas.

### 5.8 Aprobación formal de diseño

Los diseños se registran por versión y archivo. El odontólogo puede aprobar o solicitar cambios sobre una versión exacta. Escribir “aprobado” en un chat no reemplaza esta acción formal.

**Justificación:** si se reemplaza un archivo después de una aprobación, el laboratorio debe saber qué versión fue autorizada. Una decisión estructurada es auditable y puede bloquear o liberar operaciones dependientes.

### 5.9 Pagos

El odontólogo puede registrar una referencia o evidencia de pago. El pago queda pendiente de revisión hasta que un usuario administrativo lo concilie.

**Justificación:** recibir una captura no demuestra que el dinero ingresó. Separar “evidencia recibida” de “pago confirmado” reduce fraude, duplicidad y liberaciones incorrectas.

### 5.10 Seguimiento, calidad y entrega

El portal muestra el resumen de avance, responsable visible, bloqueos, calidad, envío y entrega. No expone costos internos, productividad ni detalles innecesarios de máquinas.

**Justificación:** el odontólogo necesita comprender el estado de su caso, no administrar la planta. La minimización de información también reduce exposición operativa.

## 6. Vista 2 — administración NuDental

### 6.1 Panel operativo

Se creó un panel con casos activos, pagos por revisar, envíos activos, materiales bajo mínimo y casos prioritarios.

**Justificación:** la administración necesita una bandeja de excepciones y no una reproducción de todas las tablas de la base. Los indicadores orientan la acción diaria.

### 6.2 Bandeja de casos

El laboratorio consulta casos asignados, urgencias, bloqueos, estado y saldo. Puede actualizar estados permitidos mediante transiciones controladas.

**Justificación:** no todas las transiciones son válidas. Impedir saltos arbitrarios conserva la trazabilidad y evita declarar entregado un caso que no pasó por logística.

### 6.3 Seguimiento operativo

Se puede publicar etapa, etiqueta para el cliente, responsable, ubicación, bloqueo, motivo, porcentaje, clase de porcentaje y origen.

**Justificación:** la vista del cliente debe ser comprensible, mientras el MRP conserva el detalle de operaciones. El resumen evita duplicar el planificador técnico.

### 6.4 Control de calidad

Se implementaron inspecciones con resultado aprobado, rechazado o retrabajo. Un resultado no aprobado mantiene el historial y actualiza el caso a retrabajo.

**Justificación:** sobrescribir el intento fallido eliminaría evidencia útil para medir remakes y causas. El fin de producción no debe liberar automáticamente la entrega.

### 6.5 Clientes y condiciones comerciales

El rol administrador puede gestionar cliente activo, límite de crédito, plazo y modalidad predeterminada.

**Justificación:** la autorización comercial depende de la cuenta, no del técnico ni del MRP. Los cambios predeterminados no deben alterar silenciosamente casos ya aceptados.

### 6.6 Listas de precios

Se añadieron listas por laboratorio, asignación a clínicas, precio unitario y plazo por producto.

**Justificación:** separar catálogo de lista de precios permite vender el mismo producto bajo acuerdos distintos sin duplicar su definición técnica.

### 6.7 Pagos y conciliación

La administración lista pagos pendientes, confirma o rechaza, conserva revisor y fecha, y recalcula el saldo visible.

**Justificación:** la conciliación es una decisión financiera con responsabilidad identificable. El MRP solo debe recibir la autorización necesaria, no información bancaria completa.

### 6.8 Facturación administrativa

Se incorporó una factura piloto vinculada a entregas confirmadas, con fecha, vencimiento, total, saldo y estado.

**Justificación:** una factura debe basarse en cargos elegibles y no únicamente en un indicador de caso. Se documentó que esta función no sustituye la emisión fiscal autorizada.

### 6.9 Inventario y almacén

Se implementaron materiales, SKU, categoría, unidad, stock actual, reservado, disponible, mínimo y control opcional por lote. Los movimientos soportan entrada, salida, reserva, liberación, consumo, devolución y ajustes.

**Justificación:** editar directamente un número de stock no explica qué ocurrió. Los movimientos permiten reconstruir el saldo, auditar consumos y detectar diferencias.

### 6.10 Reservas

Los materiales pueden reservarse para casos y luego consumirse o liberarse.

**Justificación:** el stock físico puede existir, pero no estar disponible para un pedido nuevo. Distinguir actual, reservado y disponible evita prometer material comprometido.

### 6.11 Proveedores y compras

Se incorporaron proveedores, plazo de suministro, órdenes de compra, líneas, cantidades, costos, recepción y actualización de inventario.

**Justificación:** el MRP puede solicitar una necesidad, pero la compra, aprobación y recepción pertenecen a administración. Esto mantiene separadas la planificación técnica y la obligación comercial.

### 6.12 Logística y envíos

Se implementaron preparación, programación, despacho, seguimiento, entrega, incidencia y cancelación, además de transportista, servicio, dirección y código de tracking.

**Justificación:** recepción física y cobranza son hechos separados. Una pieza puede entregarse con saldo pendiente o no entregarse por una regla de retención; ambos eventos deben registrarse sin falsear el otro.

### 6.13 Auditoría e integración

Las acciones relevantes generan auditoría y eventos para servicios externos. La administración puede inspeccionar la bandeja durante el piloto.

**Justificación:** cuando una integración falle, el equipo necesita saber qué se intentó, quién originó el cambio y si el evento fue reintentado.

## 7. Backend y API

El backend se reorganizó por dominios:

| Archivo | Responsabilidad | Justificación |
|---|---|---|
| `server/app.ts` | Seguridad HTTP, sesión, middlewares y montaje de rutas | Mantener la composición separada del negocio |
| `server/support.ts` | Validaciones, serialización, auditoría, notificaciones e integración | Evitar duplicación y uniformar reglas |
| `server/routes/core.ts` | Portal clínico, catálogo, pacientes, casos, mensajes, archivos y diseños | Agrupar el flujo de la Vista 1 |
| `server/routes/cases-finance.ts` | Estados, seguimiento, calidad, pagos, clientes y precios | Agrupar decisiones comerciales y de caso |
| `server/routes/inventory-purchases.ts` | Inventario, movimientos, proveedores y compras | Separar abastecimiento del flujo clínico |
| `server/routes/logistics-integration.ts` | Envíos, facturas y bandejas de integración | Separar salida física y comunicación externa |
| `server/routes/admin.ts` | Composición de módulos administrativos | Punto único de montaje de la Vista 2 |

El proyecto expone aproximadamente 39 operaciones HTTP entre autenticación, clínica y administración.

## 8. Base de datos

### 8.1 Migración incremental

Se mantuvo `001_initial.sql` y se añadió `002_nudental_views_1_2.sql`. La migración 002 incorpora 25 tablas nuevas, además de columnas, restricciones e índices.

**Justificación:** reemplazar la base completa habría dificultado migrar instalaciones existentes. Una migración registrada permite aplicar cambios en orden y comprobarlos en staging.

### 8.2 Integridad

Se utilizaron UUID, claves foráneas, restricciones de estado, cantidades positivas, unicidad por alcance y transacciones.

**Justificación:** validar únicamente en la interfaz no protege contra errores de API, scripts o integraciones. Las reglas críticas deben existir también en la base.

### 8.3 Desarrollo y producción

PGlite se conserva para desarrollo local sin Docker. PostgreSQL se configura para entorno compartido y producción.

**Justificación:** PGlite facilita comenzar, pero no es la base recomendada para concurrencia, respaldo, observabilidad y alta disponibilidad de producción.

## 9. Seguridad incorporada

- contraseñas derivadas con scrypt y sal aleatoria;
- sesiones opacas revocables;
- cookies `HttpOnly`, `SameSite` y `Secure` en producción;
- límite local de intentos de inicio de sesión;
- comprobación de origen en operaciones de escritura;
- aceptación exclusiva de JSON para cambios;
- cabeceras `no-store`, `nosniff`, `no-referrer` y Permissions Policy;
- filtros por clínica o laboratorio desde el servidor;
- roles `dentist`, `clinic_admin`, `lab_technician` y `lab_manager`;
- rechazo de campos autoritativos no admitidos;
- auditoría de acciones sensibles;
- exclusión de secretos y datos locales mediante `.gitignore`.

Estas medidas forman una base, pero no equivalen a una auditoría de penetración ni a una certificación de cumplimiento.

## 10. Integración con MRP

Se definieron eventos de salida como `case_submitted`, `file_registered`, `design_reviewed`, `message_created`, `commercial_status_updated`, `quality_updated` y `shipment_status_changed`.

El MRP deberá publicar validación técnica, planificación, operación, disponibilidad, consultas, asignaciones y consumos. Cada evento conserva identificador, agregado, revisión, correlación e idempotencia.

**Justificación:** el contrato por eventos permite que ambos equipos evolucionen con menor dependencia. La clave de idempotencia evita que un reintento genere una segunda orden o un segundo consumo.

## 11. Integraciones preparadas, pero no simuladas como terminadas

### PANDA P3 Plus

Se registra el origen `panda` y existe destino de integración. Faltan SDK/API, credenciales, licencias, formatos y prueba con equipo real.

### WhatsApp

La cola soporta el canal, pero faltan proveedor, consentimiento, plantillas aprobadas y token de servicio. El aviso externo debe contener información mínima y dirigir a la plataforma.

### Almacenamiento de archivos

La base conserva metadatos, tamaño y SHA-256. Falta el adaptador de objetos privados y URLs temporales.

### Máquinas

No se implementó arranque remoto universal. El conector local futuro debe usar únicamente interfaces documentadas y conexiones HTTPS salientes.

### Facturación fiscal

La factura actual es administrativa. La emisión tributaria requiere proveedor autorizado, serie, impuestos y validación contable.

**Justificación general:** declarar una integración sin contrato ni credenciales produciría una falsa sensación de avance y dificultaría estimar el trabajo pendiente.

## 12. Pruebas y validación

La prueba de integración levanta una base PGlite aislada, aplica migraciones, crea usuarios ficticios e inicia la API en un puerto temporal. Incluye 14 subpruebas que cubren autenticación, aislamiento, casos, catálogo, mensajes, diseños, seguimiento, calidad, pagos, envíos, facturación, inventario, compras, permisos y persistencia.

La validación final ejecutó:

```bash
npm ci
npm run check
```

`npm run check` combina:

1. `tsc --noEmit`;
2. pruebas de API y base de datos;
3. compilación del frontend.

### Correcciones finales detectadas por CI

| Error | Corrección | Por qué era necesaria |
|---|---|---|
| `paymentModes` no importado | Se añadió al import de soporte | La validación comercial debía compilar con la lista permitida |
| Genérico sobre una variable `any` en prueba PGlite | Se eliminó el genérico directo | TypeScript rechaza argumentos de tipo en llamadas no tipadas |
| Suma `number + unknown` en administración | Se convirtió `value` con `Number()` | `Object.entries` no garantizaba tipo numérico |
| Mismo problema en el portal clínico | Se aplicó la conversión equivalente | Mantener consistencia y compilación estricta |

La ejecución correctiva de GitHub Actions terminó con éxito el 26 de octubre de 2026. El commit validado fue `54b816771fa27c63b030cc03948229385672cd34`.

## 13. Documentación y configuración

Se añadieron o actualizaron:

- README principal;
- alcance de Vistas 1 y 2;
- contrato de integración MRP;
- plan de migración Next.js/Vercel;
- pruebas de aceptación;
- checklist de despliegue;
- validación técnica;
- contrato OpenAPI v0.2;
- variables de entorno de ejemplo;
- PostgreSQL local mediante Compose;
- changelog;
- guía de transferencia a GitHub;
- scripts de publicación para PowerShell y Bash.

**Justificación:** el código sin documentación concentra conocimiento en una sola persona. Los documentos convierten decisiones implícitas en criterios revisables por desarrollo, laboratorio y administración.

## 14. Limpieza y creación del paquete autónomo

Se eliminaron archivos temporales de transferencia y workflows usados únicamente para corregir la rama. Se cambió el paquete de `k2-dental-lab` a `nudental-platform`, versión `0.2.0`. También se actualizaron rutas locales, títulos, metadatos y guías históricas para evitar confusión con la denominación anterior.

El paquete final excluye:

- `.env` y secretos;
- base PGlite local;
- `node_modules`;
- `dist`;
- reportes temporales;
- claves y certificados.

## 15. Inventario técnico resumido

Antes de incluir este informe, el paquete contenía aproximadamente:

- 103 archivos de proyecto y documentación;
- 15 733 líneas de texto versionable;
- 39 operaciones HTTP;
- 25 tablas incorporadas por la migración 002;
- 15 índices en la migración 002;
- 14 subpruebas de integración.

Las cifras sirven como referencia de alcance, no como medida de calidad o porcentaje de producto terminado.

## 16. Decisiones principales y su justificación

| Decisión | Motivo |
|---|---|
| Mantener Vite/Express durante esta fase | Reducir variables mientras se completa el dominio |
| Migrar a Next.js después de congelar API | Evitar reescribir negocio y frontend simultáneamente |
| MRP separado | No duplicar planificación técnica ni control de máquinas |
| Outbox e idempotencia | Resistir fallos de red y reintentos |
| Sesiones opacas | Permitir revocación y reducir exposición del token |
| Alcance derivado de sesión | Impedir suplantación de clínica o rol desde el navegador |
| Diseño aprobado por versión | Evitar fabricar un archivo distinto al autorizado |
| Pago pendiente hasta conciliación | No confundir comprobante con dinero confirmado |
| Stock basado en movimientos | Conservar trazabilidad y reconstrucción de saldos |
| Avance medido/estimado/no disponible | No presentar datos inferidos como telemetría real |
| Proyecto autónomo NuDental | Eliminar dependencia nominal e histórica del repositorio anterior |

## 17. Límites y riesgos pendientes

1. El proyecto no ha sido sometido todavía a prueba de carga con el volumen objetivo.
2. Falta una revisión de seguridad ofensiva y configuración de producción.
3. No existe aún almacenamiento privado definitivo para escaneos y diseños.
4. MRP, PANDA y WhatsApp necesitan contratos técnicos y credenciales.
5. La factura piloto no es comprobante fiscal.
6. El frontend todavía no ha migrado a Next.js/Vercel.
7. La automatización de máquinas dependerá de interfaces reales por modelo.
8. Se deben separar desarrollo, staging y producción.
9. Deben definirse respaldo, recuperación, observabilidad y retención de datos.
10. Antes de datos reales se requiere política de privacidad, consentimiento y control de acceso operativo.

## 18. Transferencia al nuevo repositorio

Se propuso el repositorio privado `flezama-hue/NuDental`. La conexión GitHub disponible permitió leer, escribir ramas, archivos, commits, PR y Actions del repositorio existente, pero no expuso una operación para crear repositorios nuevos. Un intento de escribir en el repositorio inexistente devolvió `404 Not Found`.

Por ello se completaron todas las acciones que no requieren esa autorización:

- proyecto autónomo limpio;
- identidad NuDental;
- validación satisfactoria;
- paquete ZIP;
- checksum SHA-256;
- guía de transferencia;
- scripts de publicación.

El único paso externo restante es crear en GitHub un repositorio privado vacío llamado `NuDental`. Después se ejecuta `scripts/publicar-en-github.ps1` en Windows o `scripts/publicar-en-github.sh` en Linux/macOS.

## 19. Procedimiento de arranque local

```bash
npm ci
cp .env.example .env
# definir LOCAL_DEMO_PASSWORD con 12 a 128 caracteres
npm run db:migrate
npm run db:seed
npm run dev
```

Después se abre `http://localhost:3000`. Las cuentas ficticias se describen en el README. Solo deben utilizarse datos de prueba.

## 20. Criterios de aceptación recomendados

### Vista 1

- iniciar sesión con clínica A;
- crear paciente/referencia;
- crear caso y verificar precio;
- confirmar que clínica B no lo puede consultar;
- intercambiar mensajes;
- aprobar una versión de diseño;
- registrar pago;
- consultar calidad y entrega.

### Vista 2

- recibir caso asignado;
- actualizar seguimiento con origen correcto;
- registrar control de calidad;
- conciliar pago;
- reservar y consumir material;
- crear proveedor y compra;
- preparar y despachar envío;
- confirmar entrega y generar factura administrativa;
- comprobar que un técnico no puede modificar crédito o precios.

### Integración

- enviar dos veces el mismo evento y confirmar idempotencia;
- simular caída del receptor y verificar reintento;
- confirmar que archivos viajan por referencia y hash;
- reconciliar eventos pendientes después de restablecer conexión.

## 21. Conclusión

El trabajo deja una base funcional, documentada y validada para las Vistas 1 y 2. La principal mejora fue convertir un prototipo amplio pero mayormente simulado en una plataforma con dominio persistente, permisos, trazabilidad y fronteras claras con el MRP.

La arquitectura no pretende declarar terminado lo que todavía depende de proveedores. En cambio, deja contratos, eventos, campos y puntos de extensión para incorporar PANDA, WhatsApp, almacenamiento, facturación y máquinas de manera verificable. Esta decisión protege la credibilidad del proyecto y permite estimar las siguientes etapas con mayor precisión.
