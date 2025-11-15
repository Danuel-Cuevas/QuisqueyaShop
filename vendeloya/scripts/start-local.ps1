# Script para iniciar los emuladores de Firebase en local

Write-Host "🚀 Iniciando emuladores de Firebase..." -ForegroundColor Green

# Verificar que Firebase CLI esté instalado
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI no está instalado. Instálalo con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Verificar que Node.js esté instalado
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js no está instalado." -ForegroundColor Red
    exit 1
}

# Construir las funciones antes de iniciar
Write-Host "📦 Construyendo funciones..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir las funciones" -ForegroundColor Red
    exit 1
}

# Iniciar emuladores
Write-Host "🔥 Iniciando emuladores..." -ForegroundColor Green
firebase emulators:start

