$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ThesisDir = Resolve-Path (Join-Path $ScriptDir "..")
$FiguresDir = Join-Path $ThesisDir "figures"
$FiguresOutDir = Join-Path $FiguresDir "out"
$DrawioScale = if ($env:DRAWIO_SCALE) { $env:DRAWIO_SCALE } else { "3" }
$DrawioBorder = if ($env:DRAWIO_BORDER) { $env:DRAWIO_BORDER } else { "10" }
$DrawioExtraArgs = if ($env:DRAWIO_EXTRA_ARGS) { $env:DRAWIO_EXTRA_ARGS -split " " } else { @() }
$OpenPdf = if ($env:OPEN_PDF) { $env:OPEN_PDF } else { "1" }
Set-Location $ThesisDir

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
  `$env:DRAWIO_CLI = "C:\Program Files\draw.io\draw.io.exe"
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
        & $DrawioCli `
            @DrawioExtraArgs `
            --export `
            --format png `
            --scale $DrawioScale `
            --border $DrawioBorder `
            --output $OutputFile `
            $Source.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "draw.io export failed for $($Source.FullName)"
        }
    }
}

Export-DrawioFigures

latexmk `
  -pdfxe `
  -xelatex="xelatex -interaction=nonstopmode -halt-on-error %O %S" `
  -outdir=out `
  main.tex

if ($OpenPdf -ne "0") {
    Start-Process (Join-Path $ThesisDir "out/main.pdf")
}
