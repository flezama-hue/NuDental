# Transferencia del proyecto NuDental a un repositorio independiente

## Nombre propuesto

- Propietario: `flezama-hue`
- Repositorio: `NuDental`
- Visibilidad recomendada: privada
- Rama principal: `main`

## 1. Crear el repositorio vacío

En GitHub selecciona **New repository**, usa el nombre `NuDental`, marca **Private** y no agregues README, `.gitignore` ni licencia. El proyecto ya incluye esos archivos.

## 2. Publicar desde Windows

Abre PowerShell en la carpeta raíz y ejecuta:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\publicar-en-github.ps1
```

El script usa por defecto `https://github.com/flezama-hue/NuDental.git`. Puedes proporcionar otra dirección con `-RepoUrl`.

## 3. Publicar desde Linux o macOS

```bash
chmod +x scripts/publicar-en-github.sh
./scripts/publicar-en-github.sh
```

## 4. Comprobaciones posteriores

1. Confirma que `main` contiene `src`, `server`, `database`, `contracts` y `docs`.
2. Revisa que GitHub Actions ejecute `npm ci` y `npm run check`.
3. Verifica que no se haya subido `.env`, `.local-data`, `node_modules` ni `dist`.
4. Configura protección de rama y revisión obligatoria antes de producción.
5. Usa datos ficticios hasta habilitar un entorno de staging con PostgreSQL administrado y almacenamiento privado.

## Nota sobre historial

El paquete se publica como proyecto independiente. El commit inicial puede conservar la referencia al desarrollo previo, pero no necesita copiar el historial completo del repositorio antiguo. Esta decisión reduce ruido y evita arrastrar ramas, pruebas temporales y automatizaciones históricas.
