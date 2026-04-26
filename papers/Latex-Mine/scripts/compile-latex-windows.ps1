$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ThesisDir = Resolve-Path (Join-Path $ScriptDir "..")
$VersionFile = Join-Path $ThesisDir "version.tex"
$FiguresDir = Join-Path $ThesisDir "figures"
$FiguresOutDir = Join-Path $FiguresDir "out"
$DrawioScale = if ($env:DRAWIO_SCALE) { $env:DRAWIO_SCALE } else { "3" }
$DrawioBorder = if ($env:DRAWIO_BORDER) { $env:DRAWIO_BORDER } else { "10" }
$DrawioExtraArgs = if ($env:DRAWIO_EXTRA_ARGS) { $env:DRAWIO_EXTRA_ARGS -split " " } else { @() }
$OpenPdf = if ($env:OPEN_PDF) { $env:OPEN_PDF } else { "1" }
$PreferredDrawioCli = "D:\DrawIO\draw.io\draw.io.exe"
Set-Location $ThesisDir

function Get-ThesisVersion {
    if (-not (Test-Path $VersionFile)) {
        throw "Version file not found: $VersionFile"
    }

    $Match = Select-String -Path $VersionFile -Pattern '\\newcommand\{\\thesisVersion\}\{([^}]*)\}' | Select-Object -First 1
    if (-not $Match) {
        throw "Unable to read \thesisVersion from $VersionFile"
    }

    return $Match.Matches[0].Groups[1].Value
}

function Convert-VersionToFolderName([string]$Version) {
    return ($Version -replace '[\\/:*?"<>| ]', '_')
}

function Resolve-DrawioCli {
    if ($env:DRAWIO_CLI) {
        $ConfiguredCommand = Get-Command $env:DRAWIO_CLI -ErrorAction SilentlyContinue
        if ($ConfiguredCommand) {
            return $ConfiguredCommand.Source
        }

        if (Test-Path $env:DRAWIO_CLI) {
            return (Resolve-Path $env:DRAWIO_CLI).Path
        }

        throw "DRAWIO_CLI is set but was not found: $env:DRAWIO_CLI"
    }

    foreach ($Name in @("drawio", "draw.io", "diagrams.net")) {
        $Command = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Command) {
            return $Command.Source
        }
    }

    $Candidates = @(
        $PreferredDrawioCli,
        "D:\DrawIO\draw.io\drawio.exe",
        "D:\DrawIO\draw.io\diagrams.net.exe",
        "$env:LOCALAPPDATA\Programs\draw.io\draw.io.exe",
        "$env:LOCALAPPDATA\Programs\diagrams.net\diagrams.net.exe",
        "$env:ProgramFiles\draw.io\draw.io.exe",
        "$env:ProgramFiles\diagrams.net\diagrams.net.exe",
        "${env:ProgramFiles(x86)}\draw.io\draw.io.exe",
        "${env:ProgramFiles(x86)}\diagrams.net\diagrams.net.exe"
    )

    foreach ($Candidate in $Candidates) {
        if ($Candidate -and (Test-Path $Candidate)) {
            return (Resolve-Path $Candidate).Path
        }
    }

    throw @"
Unable to find diagrams.net/draw.io command line exporter.

Install diagrams.net Desktop, add draw.io.exe to PATH, or set DRAWIO_CLI to the executable path.
Windows example:
  `$env:DRAWIO_CLI = "D:\DrawIO\draw.io\draw.io.exe"
  powershell.exe -ExecutionPolicy Bypass -File scripts\compile-latex-windows.ps1

To compile LaTeX without regenerating figures, run:
  `$env:SKIP_FIGURE_EXPORT = "1"
  powershell.exe -ExecutionPolicy Bypass -File scripts\compile-latex-windows.ps1
"@
}

function Export-DrawioFigures {
    New-Item -ItemType Directory -Force -Path $FiguresOutDir | Out-Null

    $Sources = Get-ChildItem -Path $FiguresDir -Filter "*.drawio" -File -ErrorAction SilentlyContinue
    if (-not $Sources) {
        return
    }

    if ($env:SKIP_FIGURE_EXPORT -eq "1") {
        Write-Warning "Skipping draw.io figure export because SKIP_FIGURE_EXPORT=1."
        return
    }

    $DrawioCli = Resolve-DrawioCli
    foreach ($Source in $Sources) {
        $OutputFile = Join-Path $FiguresOutDir ($Source.BaseName + ".png")
        Write-Host "Exporting $($Source.Name) -> $OutputFile (scale=$DrawioScale, border=$DrawioBorder)"

        if (Test-Path $OutputFile) {
            Remove-Item -Force $OutputFile
        }

        $DrawioArgs = @()
        if ($DrawioExtraArgs.Count -gt 0) {
            $DrawioArgs += $DrawioExtraArgs
        }
        $DrawioArgs += @(
            "--export"
            "--format", "png"
            "--scale", $DrawioScale
            "--border", $DrawioBorder
            "--output", $OutputFile
            $Source.FullName
        )

        & $DrawioCli @DrawioArgs
        $ExitCode = $LASTEXITCODE

        if ($ExitCode -ne 0 -and -not (Test-Path $OutputFile)) {
            throw "draw.io export failed for $($Source.FullName) (exit code: $ExitCode)"
        }

        if (-not (Test-Path $OutputFile)) {
            throw "draw.io did not create output file: $OutputFile"
        }
    }
}

Export-DrawioFigures

$ThesisVersion = Get-ThesisVersion
$OutDirName = Convert-VersionToFolderName $ThesisVersion
$OutDir = Join-Path $ThesisDir "out\$OutDirName"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Write-Host "Building thesis version $ThesisVersion -> $OutDir"

if (-not (Get-Command latexmk -ErrorAction SilentlyContinue)) {
    throw "latexmk was not found in PATH. Please install TeX Live/MiKTeX with latexmk and ensure it is available in PATH."
}

latexmk `
  -pdfxe `
  -xelatex="xelatex -interaction=nonstopmode -halt-on-error %O %S" `
  -usebiber `
  -file-line-error `
  -synctex=1 `
  -interaction=nonstopmode `
  -halt-on-error `
  "-outdir=$OutDir" `
  main.tex

if ($OpenPdf -ne "0") {
    Start-Process (Join-Path $OutDir "main.pdf")
}
