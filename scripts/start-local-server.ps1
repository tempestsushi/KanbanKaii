param(
    [string]$TunnelName = "",
    [string]$CloudflaredPath = "cloudflared",
    [switch]$UseNgrok,
    [string]$NgrokPath = "C:\ngrok\ngrok.exe",
    [string]$RedisContainer = "kanbankaii-redis",
    [string]$OllamaModel = "llama3.2:3b"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $ProjectRoot "backend"
$Uvicorn = Join-Path $BackendRoot "venv\Scripts\uvicorn.exe"
$Arq = Join-Path $BackendRoot "venv\Scripts\arq.exe"

if ($UseNgrok -and $TunnelName) {
    throw "Choose either -UseNgrok or -TunnelName, not both."
}

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-HttpEndpoint([string]$Url) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForEndpoint([string]$Url, [string]$Service, [int]$Attempts = 15) {
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        if (Test-HttpEndpoint $Url) {
            Write-Host "$Service is ready." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 1
    }
    throw "$Service did not become ready at $Url. Check its terminal for errors."
}

function Start-ServiceTerminal(
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Command
) {
    $windowCommand = "`$Host.UI.RawUI.WindowTitle='$Title'; $Command"
    Start-Process powershell.exe `
        -WorkingDirectory $WorkingDirectory `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $windowCommand) |
        Out-Null
}

if (-not (Test-Path $Uvicorn) -or -not (Test-Path $Arq)) {
    throw "Backend virtual environment commands are missing. Expected them under backend\venv\Scripts."
}

Write-Step "Checking Docker and Redis"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker was not found. Start Docker Desktop and ensure the docker command is available."
}
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait until it is ready, then run this script again."
}

$containerExists = docker container inspect $RedisContainer 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Redis container '$RedisContainer' does not exist. Create it using the Redis command in COMMANDS.md."
}
$redisRunning = docker inspect -f "{{.State.Running}}" $RedisContainer 2>$null
if ($redisRunning -ne "true") {
    docker start $RedisContainer | Out-Null
}
$pong = docker exec $RedisContainer redis-cli ping 2>$null
if ($pong -ne "PONG") {
    throw "Redis started but did not return PONG."
}
Write-Host "Redis is ready." -ForegroundColor Green

Write-Step "Checking Ollama and model"
$Ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $Ollama) {
    throw "Ollama was not found in PATH. Install it or add ollama.exe to PATH."
}
if (-not (Test-HttpEndpoint "http://127.0.0.1:11434/api/tags")) {
    Start-Process $Ollama.Source -ArgumentList "serve" -WindowStyle Hidden | Out-Null
    Wait-ForEndpoint "http://127.0.0.1:11434/api/tags" "Ollama"
}
$modelInstalled = (& $Ollama.Source list) -match [regex]::Escape($OllamaModel)
if (-not $modelInstalled) {
    throw "Ollama model '$OllamaModel' is missing. Run: ollama pull $OllamaModel"
}
Write-Host "Ollama model $OllamaModel is ready." -ForegroundColor Green

Write-Step "Starting FastAPI"
if (Test-HttpEndpoint "http://127.0.0.1:8000/health") {
    Write-Host "FastAPI is already running." -ForegroundColor Yellow
}
else {
    Start-ServiceTerminal `
        "KanbanKaii - FastAPI" `
        $BackendRoot `
        "& '$Uvicorn' app.main:app --host 127.0.0.1 --port 8000"
    Wait-ForEndpoint "http://127.0.0.1:8000/health" "FastAPI"
}

Write-Step "Starting ARQ worker"
$workerRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*app.workers.slack_worker.WorkerSettings*" } |
    Select-Object -First 1
if ($workerRunning) {
    Write-Host "ARQ worker is already running." -ForegroundColor Yellow
}
else {
    Start-ServiceTerminal `
        "KanbanKaii - ARQ Worker" `
        $BackendRoot `
        "& '$Arq' app.workers.slack_worker.WorkerSettings"
    Write-Host "ARQ worker terminal opened." -ForegroundColor Green
}

if ($UseNgrok) {
    Write-Step "Starting ngrok"
    if (-not (Test-Path $NgrokPath)) {
        throw "ngrok was not found at '$NgrokPath'. Pass -NgrokPath with its full location."
    }
    $ngrokRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "ngrok.exe" -and $_.CommandLine -like "*http*8000*" } |
        Select-Object -First 1
    if ($ngrokRunning) {
        Write-Host "ngrok is already forwarding port 8000." -ForegroundColor Yellow
    }
    else {
        Start-ServiceTerminal `
            "KanbanKaii - ngrok" `
            (Split-Path -Parent $NgrokPath) `
            "& '$NgrokPath' http 8000"
        Write-Host "ngrok terminal opened." -ForegroundColor Green
    }
}
elseif ($TunnelName) {
    Write-Step "Starting Cloudflare Tunnel '$TunnelName'"
    $Cloudflared = Get-Command $CloudflaredPath -ErrorAction SilentlyContinue
    if (-not $Cloudflared) {
        throw "cloudflared was not found. Install it or pass -CloudflaredPath with its full path."
    }
    $tunnelRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*cloudflared*tunnel*run*$TunnelName*" } |
        Select-Object -First 1
    if ($tunnelRunning) {
        Write-Host "Cloudflare Tunnel is already running." -ForegroundColor Yellow
    }
    else {
        Start-ServiceTerminal `
            "KanbanKaii - Cloudflare Tunnel" `
            $ProjectRoot `
            "& '$($Cloudflared.Source)' tunnel run '$TunnelName'"
        Write-Host "Cloudflare Tunnel terminal opened." -ForegroundColor Green
    }
}
else {
    Write-Host "`nPublic tunnel was skipped. Pass -UseNgrok or -TunnelName." -ForegroundColor Yellow
}

Write-Host "`nKanbanKaii local services are started." -ForegroundColor Green
Write-Host "FastAPI: http://127.0.0.1:8000"
Write-Host "Swagger: http://127.0.0.1:8000/docs"
