$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..\..")

Push-Location $RepoRoot
try {
    pnpm run build:thesis
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm run build:thesis failed with exit code: $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
