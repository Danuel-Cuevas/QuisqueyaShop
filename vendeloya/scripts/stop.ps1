# Script para detener todos los emuladores de Firebase en Windows
Write-Host "Deteniendo emuladores de Firebase..." -ForegroundColor Yellow
Write-Host ""

# Puertos de Firebase emulators
$ports = @(8080, 9099, 5001, 9199, 4000, 5000, 8086)
$stopped = 0

foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    foreach ($conn in $connections) {
        if ($conn -match '\s+(\d+)$') {
            $pid = $matches[1]
            try {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "   Deteniendo proceso en puerto $port (PID: $pid): $($proc.ProcessName)" -ForegroundColor Red
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    $stopped++
                }
            } catch {
                # Ignorar errores
            }
        }
    }
}

# Tambien buscar procesos de Node.js que puedan ser emuladores
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($cmdLine -like "*firebase*emulator*" -or $cmdLine -like "*java*firebase*") {
                Write-Host "   Deteniendo proceso Node.js (PID: $($proc.Id))" -ForegroundColor Red
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $stopped++
            }
        } catch {
            # Ignorar errores
        }
    }
}

# Buscar procesos Java que puedan ser Pub/Sub emulator
$javaProcesses = Get-Process java -ErrorAction SilentlyContinue
if ($javaProcesses) {
    foreach ($proc in $javaProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($cmdLine -like "*pubsub*" -or $cmdLine -like "*firebase*") {
                Write-Host "   Deteniendo proceso Java Pub/Sub (PID: $($proc.Id))" -ForegroundColor Red
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $stopped++
            }
        } catch {
            # Ignorar errores
        }
    }
}

# Esperar un momento para que los procesos se detengan
Start-Sleep -Seconds 2

if ($stopped -gt 0) {
    Write-Host ""
    Write-Host "OK: $stopped proceso(s) detenido(s)" -ForegroundColor Green
} else {
    Write-Host "Info: No se encontraron procesos de emuladores corriendo" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Ahora puedes ejecutar: npm start" -ForegroundColor Cyan
