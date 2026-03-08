# BC4 Procurement Agent — Quick Start Script
# Run this script to start all services

param(
    [switch]$SkipDocker,
    [switch]$SeedDemo,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  BC4 Procurement Planning Agent - Quick Start" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

$pythonVersion = & python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Found: $pythonVersion" -ForegroundColor Green

if (-not $SkipDocker) {
    $dockerVersion = & docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Docker not found. Start PostgreSQL manually or use -SkipDocker flag." -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Found: $dockerVersion" -ForegroundColor Green
    }
}

# Step 2: Check .env
Write-Host "[2/6] Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env file missing! Copy .env.example to .env and configure." -ForegroundColor Red
    exit 1
}

# Step 3: Start PostgreSQL via Docker Compose
if (-not $SkipDocker -and -not $FrontendOnly) {
    Write-Host "[3/6] Starting PostgreSQL via Docker Compose..." -ForegroundColor Yellow
    docker compose up -d postgres 2>&1 | Out-Null
    Write-Host "  ✓ PostgreSQL container started" -ForegroundColor Green
    Write-Host "  Waiting for database to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
} else {
    Write-Host "[3/6] Skipping Docker (PostgreSQL)..." -ForegroundColor Gray
}

# Step 4: Install Python dependencies
if (-not $FrontendOnly) {
    Write-Host "[4/6] Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt --quiet 2>&1 | Out-Null
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
}

# Step 5: Seed demo data (optional)
if ($SeedDemo -and -not $FrontendOnly) {
    Write-Host "[5/6] Seeding demo data..." -ForegroundColor Yellow
    python -m backend.seed
    Write-Host "  ✓ Demo data seeded" -ForegroundColor Green
} else {
    Write-Host "[5/6] Skipping seed (use -SeedDemo flag to seed)..." -ForegroundColor Gray
}

# Step 6: Start services
Write-Host "[6/6] Starting services..." -ForegroundColor Yellow

if (-not $FrontendOnly) {
    Write-Host "  Backend: http://127.0.0.1:8000" -ForegroundColor Cyan
    Write-Host "  API docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan

    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        uvicorn api:app --reload --host 0.0.0.0 --port 8000
    }
    Write-Host "  ✓ Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
    Start-Sleep -Seconds 4
}

if (-not $BackendOnly) {
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan

    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "$using:PWD\frontend"
        npm run dev
    }
    Write-Host "  ✓ Frontend started (Job ID: $($frontendJob.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  All services running!" -ForegroundColor Green
Write-Host "  Backend API:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Frontend UI:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Keep alive — wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host ""
    Write-Host "Shutting down services..." -ForegroundColor Yellow
    if ($backendJob) { Stop-Job -Job $backendJob -ErrorAction SilentlyContinue; Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue }
    if ($frontendJob) { Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue; Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue }
    Write-Host "✓ All services stopped" -ForegroundColor Green
}
