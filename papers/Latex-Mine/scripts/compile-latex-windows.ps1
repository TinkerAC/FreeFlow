$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ThesisDir = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ThesisDir

latexmk `
  -pdfxe `
  -xelatex="xelatex -interaction=nonstopmode -halt-on-error %O %S" `
  -outdir=out `
  main.tex