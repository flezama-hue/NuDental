# Contrato de integración NuDental ↔ MRP

## Principios

1. No se comparte base de datos.
2. Cada evento tiene identificador único y `idempotency_key`.
3. El productor persiste el cambio de negocio y el evento en la misma transacción cuando corresponde.
4. El consumidor confirma el procesamiento; un reintento no crea una segunda operación.
5. Los archivos viajan por referencia privada y huella SHA-256, no embebidos en el evento.
6. El portal del odontólogo recibe un resumen comprensible; no expone colas internas, costos operativos o información innecesaria de máquinas.
7. El origen del avance se conserva: `manual`, `mrp` o `machine`.
8. Un porcentaje indica `measured`, `estimated` o `unavailable`.

## Eventos de salida ya generados

| Evento | Agregado | Uso esperado |
|---|---|---|
| `case_submitted` | case | El MRP recibe caso, revisión, trabajos y referencias de archivos. |
| `file_registered` | case | Se informa una nueva versión de archivo o diseño. |
| `design_reviewed` | case | Se comunica aprobación o solicitud de cambios de una versión exacta. |
| `message_created` | case | Sincroniza conversación; el texto no cambia aprobaciones. |
| `commercial_status_updated` | case | Informa autorización o decisión comercial pertinente. |
| `quality_updated` | case | Conserva el resultado compartido; el MRP mantiene el detalle productivo. |
| `shipment_status_changed` | shipment | Actualiza despacho o entrega sin mezclarlo con producción. |

## Eventos que debe publicar el MRP

La primera integración debe aceptar, validar y almacenar como mínimo:

- `technical_validation_updated`;
- `work_planned`;
- `operation_updated`;
- `production_availability_updated`;
- `technical_query_opened` y `technical_query_resolved`;
- `technician_assignment_updated`;
- `quality_updated`;
- `material_requirement_updated`;
- `material_consumption_reported`.

El endpoint receptor definitivo no se expone todavía porque debe acordarse la autenticación con el equipo MRP. La propuesta es:

```text
POST /integracion/v1/eventos
Authorization: firma HMAC o credencial de servicio rotatoria
Idempotency-Key: <clave estable del emisor>
Content-Type: application/json
```

## Forma mínima del evento

```json
{
  "eventId": "uuid",
  "eventType": "operation_updated",
  "occurredAt": "2026-10-26T15:00:00Z",
  "aggregate": { "type": "case", "id": "uuid", "revision": 3 },
  "source": "mrp",
  "data": {},
  "trace": { "correlationId": "uuid", "causationId": "uuid" }
}
```

## Estados y bloqueos

- Un mensaje informativo no bloquea.
- Solo el MRP crea o retira un bloqueo técnico.
- Responder una consulta no elimina automáticamente el bloqueo.
- Pueden coexistir varios bloqueos.
- Cambiar un archivo o prescripción incrementa revisión y puede invalidar aprobaciones dependientes.
- Finalizar una máquina no significa calidad aprobada.
- Calidad aprobada no significa pago, despacho o entrega.

## Procesador de la cola

La ruta administrativa `GET /api/admin/integrations/outbox` permite inspección durante el piloto. El adaptador real debe:

1. reservar un evento pendiente;
2. enviarlo con su `idempotency_key`;
3. marcarlo `sent` solo después de una confirmación persistida;
4. marcar `failed`, conservar error y programar reintento;
5. enviar a una cola de revisión después del máximo configurado;
6. registrar métricas, latencia y última sincronización.

No se debe operar el adaptador definitivo mediante una sesión humana del navegador. Se implementará como worker o servicio con credencial propia.
