param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$NewVersion,
    [switch]$Force
)

# Validate semver format
if ($NewVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "ERROR: La version debe tener formato X.Y.Z (ej: 3.2.0)" -ForegroundColor Red
    exit 1
}

$rootDir = Split-Path -Parent $PSScriptRoot
$pkgFile = Join-Path $rootDir "package.json"
$readmeFile = Join-Path $rootDir "README.md"

# Read current version from package.json
$pkgJsonRaw = Get-Content $pkgFile -Raw -Encoding UTF8
$pkgJson = $pkgJsonRaw | ConvertFrom-Json
$oldVer = $pkgJson.version

if ($oldVer -eq $NewVersion) {
    Write-Host "Ya estas en version $NewVersion. No hay nada que actualizar." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "         VERSION BUMP SCRIPT" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  $oldVer ----> $NewVersion" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Preview changes
Write-Host "Cambios a realizar:" -ForegroundColor Yellow
Write-Host "  * package.json: version $oldVer -> $NewVersion" -ForegroundColor White

if (Test-Path $readmeFile) {
    $readmeContent = Get-Content $readmeFile -Raw -Encoding UTF8

    $vCount = [regex]::Matches($readmeContent, [regex]::Escape($oldVer)).Count
    $tagCount = [regex]::Matches($readmeContent, [regex]::Escape("v$oldVer")).Count

    if ($vCount -gt 0) {
        Write-Host "  * README.md: $vCount ocurrencias de '$oldVer' -> '$NewVersion'" -ForegroundColor White
    }
    if ($tagCount -gt 0) {
        Write-Host "  * README.md: $tagCount ocurrencias de 'v$oldVer' -> 'v$NewVersion'" -ForegroundColor White
    }
    Write-Host "  * README.md: URLs de GitHub actualizadas (tag y nombre de archivo)" -ForegroundColor White
    Write-Host "  * README.md: Links de Mega NO se modifican" -ForegroundColor White
}

Write-Host "  * package-lock.json: se regenera via npm install" -ForegroundColor White
Write-Host ""

# Confirmation
# Auto-confirm with -Force flag or prompt interactively
$confirmed = $false
if ($Force) {
    $confirmed = $true
} else {
    try {
        $confirmation = Read-Host "Confirmar cambios? (s/N)"
        if ($confirmation -eq "s" -or $confirmation -eq "S") { $confirmed = $true }
    } catch {
        # Non-interactive mode, use -Force to skip prompt
        Write-Host "  [--] Modo no interactivo y sin -Force. Pasando -Force para continuar..." -ForegroundColor Yellow
        $confirmed = $true
    }
}
if (-not $confirmed) {
    Write-Host "Cancelado." -ForegroundColor Red
    exit 0
}

# 1. Update package.json version field
$pkgJson.version = $NewVersion
$pkgJson | ConvertTo-Json -Depth 10 | Set-Content $pkgFile -Encoding UTF8
Write-Host "  [OK] package.json actualizado" -ForegroundColor Green

# 2. Update README.md
if (Test-Path $readmeFile) {
    $readmeContent = Get-Content $readmeFile -Raw -Encoding UTF8
    $originalReadme = $readmeContent

    # Replace vX.Y.Z -> vA.B.C (tag references, URLs, etc.)
    $readmeContent = $readmeContent -replace [regex]::Escape("v$oldVer"), "v$NewVersion"

    # Replace bare X.Y.Z -> A.B.C (version strings, filenames, etc.)
    # This intentionally does NOT touch Mega links (they use file ID format, not version numbers)
    $readmeContent = $readmeContent -replace [regex]::Escape($oldVer), $NewVersion

    if ($readmeContent -ne $originalReadme) {
        $readmeContent | Set-Content $readmeFile -Encoding UTF8
        Write-Host "  [OK] README.md actualizado" -ForegroundColor Green
    } else {
        Write-Host "  [--] README.md sin cambios (no se encontraron referencias a $oldVer)" -ForegroundColor Yellow
    }
}

# 3. Regenerate package-lock.json
Write-Host "  [..] Regenerando package-lock.json..." -ForegroundColor Yellow
$installOutput = & npm install 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] package-lock.json regenerado" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] npm install fallo:" -ForegroundColor Red
    Write-Host $installOutput -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  BUMP COMPLETADO: $oldVer -> $NewVersion" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivos modificados:" -ForegroundColor Yellow
Write-Host "  * package.json" -ForegroundColor White
if (Test-Path $readmeFile) { Write-Host "  * README.md" -ForegroundColor White }
Write-Host "  * package-lock.json" -ForegroundColor White
Write-Host ""
Write-Host "Proximos pasos opcionales:" -ForegroundColor Yellow
Write-Host "  1. Compilar .exe:       npm run make" -ForegroundColor White
Write-Host "  2. Crear release:       gh release create v$NewVersion --title `"GM-3000 v$NewVersion Estable`" --notes `"Version estable GM-3000 v$NewVersion`"" -ForegroundColor White
Write-Host "  3. Subir installer:     gh release upload v$NewVersion out/make/squirrel.windows/x64/GM-3000.Setup.exe" -ForegroundColor White
Write-Host "  4. Subir portable:      gh release upload v$NewVersion out/make/zip/win32/x64/GM-3000-win32-x64-$NewVersion.zip" -ForegroundColor White
Write-Host ""
Write-Host "Recordatorio: actualizar links de Mega manualmente en README.md" -ForegroundColor Magenta
Write-Host ""
