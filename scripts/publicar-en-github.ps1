param(
    [string]$RepoUrl = "https://github.com/flezama-hue/NuDental.git"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
    throw "Ejecuta este script desde la raíz del proyecto NuDental."
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git no está instalado o no está disponible en PATH."
}

if (-not (Test-Path ".git")) {
    git init -b main
}

git add .
$status = git status --porcelain
if ($status) {
    git commit -m "feat: initialize standalone NuDental views 1 and 2"
}

$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $RepoUrl
} elseif ($origin -ne $RepoUrl) {
    git remote set-url origin $RepoUrl
}

git branch -M main
git push -u origin main
Write-Host "NuDental publicado en $RepoUrl" -ForegroundColor Green
