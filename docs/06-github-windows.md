# Subir el proyecto y trabajar desde Windows

Ruta recomendada: **GitHub Desktop + Visual Studio Code**. Para este proyecto web usa Visual Studio Code; no necesitas crear una solución de C++ en Visual Studio.

## 1. Qué instalar

| Herramienta | Función | Enlace oficial |
|---|---|---|
| GitHub Desktop | Crear repositorio, guardar versiones y subir cambios | https://desktop.github.com/download/ |
| Visual Studio Code | Abrir y editar el proyecto | https://code.visualstudio.com/download |
| Node.js 24 LTS | Ejecutar JavaScript, npm, frontend y backend | https://nodejs.org/en/download |
| Docker Desktop (opcional) | Usar PostgreSQL como servidor separado | https://www.docker.com/products/docker-desktop/ |

La vía inicial con PGlite no requiere Docker. El instalador de Node incluye npm.

## 2. Elegir dónde quedará el repositorio

Un **repositorio** guarda el código. Un **GitHub Project** es un tablero de tareas opcional y no sustituye al repositorio.

Como es un trabajo remunerado, propongo que el repositorio pertenezca a la organización de la empresa, si existe y tienes permiso. Si vas a comenzar bajo tu cuenta, usa un repositorio privado y acuerda la propiedad con el responsable. Tu usuario indicado anteriormente fue `flezama-hue`: confirma que esa es la cuenta que GitHub Desktop muestra antes de publicar.

Invitar a la cuenta personal del trabajo como colaboradora no la convierte en propietaria. Si necesita administrar accesos o tener continuidad de propiedad, conviene un repositorio de organización. No compartas la contraseña de tu cuenta personal con compañeros.

## 3. Crear el repositorio local sin confundir carpetas

1. Descarga el ZIP de esta entrega. Clic derecho > **Extraer todo**. No trabajes dentro del ZIP.
2. Abre GitHub Desktop e inicia sesión con la cuenta acordada.
3. Elige **File > New repository** (o **Create a New Repository on your Hard Drive**).
4. Nombre: `NuDental`. Descripción: `Plataforma clínica y administrativa NuDental`.
5. Local path: `C:\Proyectos`. Desktop creará `C:\Proyectos\NuDental`.
6. No marques creación de README; en Git ignore elige **None** y en License **None**. La entrega trae README y .gitignore propios y conserva avisos del código original.
7. Pulsa **Create repository**.
8. En el explorador, abre la carpeta extraída que contiene `package.json`. Copia **su contenido** a `C:\Proyectos\NuDental`. No copies otra carpeta NuDental dentro de NuDental.
9. Verifica la estructura: `C:\Proyectos\NuDental\package.json`, `src`, `server`, `database`, `docs`, `contracts`, `.github`, `.env.example` y `.gitignore`.

En esta copia preparada no se incluye `.git` ni el historial del repositorio original. Si, en cambio, decides seguir con el repositorio existente del equipo, clónalo y trabaja en una rama; no reemplaces su historial con esta importación.

## 4. Guardar la primera versión y publicarla

1. Vuelve a Desktop > **Changes**. Revisa los archivos.
2. Deben aparecer código/documentos/configuración. No deben aparecer `.env`, `.local-data`, `node_modules` ni `dist`; `.env.example` sí se incluye.
3. En **Summary**, escribe: `feat: base local, modelo de datos y documentación inicial`.
4. Pulsa **Commit to main**. Un commit guarda la versión en tu computadora.
5. Pulsa **Publish repository**. Mantén marcada **Keep this code private**.
6. En **Organization**, elige la del trabajo si tienes permiso; **None** publica bajo tu cuenta.
7. Pulsa **Publish Repository** y luego **Repository > View on GitHub**.
8. Comprueba que se ven `src`, `server`, `database`, `contracts`, `docs` y `package.json`.

Esto publica código, no una aplicación en Internet. Si el nombre ya existe en esa misma cuenta, usa un nombre acordado como `NuDental-Desarrollo`; no borres el anterior para hacer espacio.

## 5. Dar acceso a la cuenta del trabajo y compañeros

### Repositorio personal privado

1. Pide el **usuario exacto de GitHub** de cada persona/cuenta. No adivines por nombre.
2. En GitHub abre tu repositorio > **Settings > Collaborators > Add people**.
3. Busca y confirma el usuario; envía la invitación.
4. Repite con la cuenta del trabajo y cada compañero.
5. Cada persona debe aceptar la invitación con la cuenta correcta. En la lista de acceso comprueba que ya no figure pendiente.

En un repositorio personal privado, un colaborador tiene lectura **y escritura**; no hay un rol de solo lectura para ese caso. No tendrá todos los permisos de propietario.

### Repositorio de organización

Desde Settings > **Collaborators and teams / Manage access** (el nombre depende de la vista), asigna personas o equipos con el administrador de la organización.

| Persona | Rol propuesto | Motivo |
|---|---|---|
| Compañeros que programan | Write | Subir ramas y colaborar. |
| Jefe que solo consulta y comenta | Read | Revisar sin modificar código. |
| Responsable que coordina el repositorio | Maintain | Administrar trabajo sin todas las acciones destructivas. |
| Responsable autorizado de accesos | Admin | Gestionar permisos y configuración. |

La invitación debe aceptarse. Si hay controles de organización/SSO, el administrador debe habilitar el acceso. No se han enviado invitaciones por este paquete.

## 6. Ejecutar el proyecto en tu laptop

En Desktop > **Repository > Open in Visual Studio Code**. También puedes abrir VS Code > File > Open Folder y elegir la carpeta con package.json.

En Terminal > New Terminal:

```powershell
npm ci
Copy-Item .env.example .env
```

Abre `.env`, escribe una clave local de 12 a 128 caracteres en `LOCAL_DEMO_PASSWORD=` y guarda. Luego:

```text
npm run db:migrate
npm run db:seed
npm run dev
```

Abre `http://localhost:3000`; entra con `dentista.a@example.test` y tu clave local. El prototipo anterior se ve con **Prototipo visual**; sus pantallas no guardan datos. El módulo conectado sí guarda pacientes. Usa solo datos ficticios.

## 7. Rutina para trabajar en equipo

1. Antes de trabajar: Desktop > **Fetch origin**; si aparecen cambios, **Pull origin** con tu carpeta sin cambios pendientes.
2. Elige `main`, actualízala y crea **Current branch > New branch**: `freddy/pacientes-edicion`.
3. Edita en VS Code. Ejecuta `npm run check` y revisa el resultado.
4. En Desktop revisa el diff, escribe un mensaje concreto y pulsa **Commit to freddy/pacientes-edicion**.
5. Primera subida de la rama: **Publish branch**; siguientes: **Push origin**.
6. Abre un **Pull Request** hacia `main`, explica problema/cambio/pruebas y solicita revisión a un compañero.
7. Después de la revisión y los controles, integra con **Merge**; todos actualizan su main con Fetch/Pull.

Una rama guarda tu trabajo separado. Un Pull Request solicita revisión para incorporarlo. Un commit es local hasta que haces Push. Cada compañero clona una vez el mismo repositorio; no necesitan crearse un repositorio nuevo por persona.

Protección de main con revisión y controles requeridos: configurarla si la cuenta/plan la permite. El paquete incluye un workflow de comprobación y plantilla de PR; no cambia ajustes de GitHub ni acredita ejecuciones remotas previas.

## 8. Si algo falla

| Mensaje / síntoma | Qué revisar |
|---|---|
| `npm` no reconocido | Instala Node 24 LTS; cierra y vuelve a abrir VS Code. |
| `npm.ps1` bloqueado | Usa `npm.cmd` o terminal Command Prompt; no hace falta desactivar toda la política de Windows. |
| No encuentra package.json | Estás en otra carpeta. Abre la que contiene el archivo directamente. |
| GitHub 404 / Permission denied | Cuenta correcta, invitación aceptada y permiso al repositorio. |
| Login no conecta / 500 al comenzar | Ejecuta migración y seed antes de dev; revisa que APP_ORIGIN sea http://localhost:3000. |
| Clave local no funciona tras editar .env | Seed no cambia claves existentes. No borres una base con trabajo útil: solicita un cambio de contraseña controlado. |
| Base local bloqueada | Detén otros procesos que usan esa carpeta; no ejecutes seed y dev simultáneamente. |
| Puerto 3000/3001 ocupado | Detén la otra instancia. No cambies solo la URL sin ajustar origen/proxy. |
| Push rechazado / conflicto | Haz commit de tu trabajo y revisa el conflicto con el equipo; no uses Force push para resolverlo. |

## 9. Ruta alternativa por terminal, solo para repositorio nuevo vacío

Si eliges Desktop, no necesitas esta ruta. Si prefieres Git instalado por separado, crea en github.com/new un repositorio privado sin README/gitignore/licencia y, dentro de la carpeta de código sin repositorio Git previo:

```text
git init -b main
git config user.name "TU_NOMBRE"
git config user.email "TU_CORREO_DE_COMMITS"
git add .
git status
git commit -m "feat: base independiente de NuDental"
git remote add origin URL_HTTPS_REAL_DEL_REPOSITORIO
git push -u origin main
```

Sustituye los marcadores por tus datos/URL. No ejecutes `git init` sobre el clon existente del equipo ni pegues contraseñas/tokens en los comandos. La autenticación se completa con el flujo de GitHub en tu computadora.

## Fuentes consultadas el 05/10/2026

- Crear/publicar con Desktop: https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop
- Publicar proyecto existente: https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop
- Invitar colaboradores: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository
- Permisos de repositorio personal: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository
- Roles de organización: https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization
- Node: https://nodejs.org/en/download
