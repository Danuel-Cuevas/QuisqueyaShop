# Script completo para iniciar la aplicacion localmente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando QuisqueyaShop Localmente" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   OK: Node.js $nodeVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Node.js no esta instalado" -ForegroundColor Red
    exit 1
}

# Verificar Firebase CLI
Write-Host "[2/5] Verificando Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "   OK: Firebase CLI $firebaseVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Firebase CLI no esta instalado" -ForegroundColor Red
    Write-Host "   Instalando Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Detener procesos anteriores
Write-Host "[3/5] Limpiando puertos..." -ForegroundColor Yellow
$ports = @(8080, 9099, 5001, 9199, 4000, 5000, 8086)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    foreach ($conn in $connections) {
        if ($conn -match '\s+(\d+)$') {
            $pid = $matches[1]
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            } catch {
                # Ignorar errores
            }
        }
    }
}
Start-Sleep -Seconds 1
Write-Host "   OK: Puertos limpiados" -ForegroundColor Green

# Verificar dependencias
Write-Host "[4/5] Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   OK: Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Construir servicios
Write-Host "[5/5] Construyendo servicios..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: Servicios construidos" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Error al construir servicios" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Todo listo! Iniciando emuladores..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs importantes:" -ForegroundColor Cyan
Write-Host "  - Aplicacion: http://localhost:5000" -ForegroundColor White
Write-Host "  - Firebase UI: http://localhost:4000" -ForegroundColor White
Write-Host "  - API Gateway: http://localhost:5001/vendeloya-2e40d/us-central1/apiGateway" -ForegroundColor White
Write-Host ""
Write-Host "Para poblar la base de datos, abre otra terminal y ejecuta:" -ForegroundColor Yellow
Write-Host "  npm run seed" -ForegroundColor White
Write-Host ""

# Iniciar emuladores
firebase emulators:start

