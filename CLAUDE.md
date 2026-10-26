# Guía de trabajo de NuDental

Lee `README.md`, `docs/08-vistas-1-2.md` y `docs/09-integracion-mrp.md` antes de modificar el sistema. La entrada conectada es `src/Workspace.tsx`; el prototipo visual histórico permanece separado en `src/App.tsx` y se abre con `/#demo`. El backend está en `server/`, las migraciones en `database/` y los contratos en `contracts/`.

Comandos principales: `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npm run dev` y `npm run check`. No ejecutes el seed en producción ni versiones `.env`, `.local-data`, `node_modules`, `dist`, claves o archivos clínicos.

Toda ruta con datos clínicos debe verificar identidad, rol y alcance desde el servidor. El navegador nunca determina de forma autoritativa la clínica, el laboratorio ni el rol. Mantén las pruebas de aislamiento y no afirmes que PANDA, MRP, WhatsApp, almacenamiento o facturación están integrados hasta contar con credenciales, contrato técnico y prueba de aceptación.
