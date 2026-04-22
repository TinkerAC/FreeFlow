# FreeFlow 本科毕业论文 LaTeX 工程

本目录用于编写 FreeFlow 项目的毕业论文正文，样板工程统一保留在 `papers/Latex-Template`。当前目录仅保留 FreeFlow 论文编译所需的类文件、封面资源、字体、参考文献文件和正文结构。

## 目录说明

- `main.tex`：论文编译入口。
- `version.tex`：论文版本号单一来源，封面显示和编译输出目录都读取这里。
- `zufe.cls`：学校论文格式类文件，已适配本项目随附中文字体。
- `chapters/`：论文正文、摘要、致谢、附录等内容。
- `figures/`：论文图表源文件，`.drawio` 为源文件，`figures/out/` 为编译前自动导出的图片文件。
- `misc/`：封面、原创性声明、参考文献等固定结构。
- `InitFile/`：学校名称和校徽图片。
- `Reference.bib`：FreeFlow 论文参考文献。
- `scripts/`：IDEA Run Configuration 调用的跨平台编译脚本。

## 图表工作流

论文图表统一以 `figures/*.drawio` 作为可编辑源文件。编译脚本会在 LaTeX 编译前调用 diagrams.net/draw.io 命令行导出器，将图片输出到 `figures/out/*.png`。正文中只引用 `figures/out/` 下的图片，不直接引用根目录下的生成图片。

默认 PNG 导出参数为 `--scale 3 --border 10`，用于提高论文中的显示清晰度。需要更高清图片时，可设置 `DRAWIO_SCALE=4`；如果图片文件过大，可改为 `DRAWIO_SCALE=2`。`DRAWIO_BORDER` 用于控制图像边距，默认值为 `10`。特殊环境下需要额外传递 draw.io 参数时，可设置 `DRAWIO_EXTRA_ARGS`，例如 `DRAWIO_EXTRA_ARGS=--disable-gpu`。

如果本机没有安装 diagrams.net/draw.io 命令行导出器，需要先安装 diagrams.net Desktop，或通过 `DRAWIO_CLI` 指定可执行文件路径。临时只编译 LaTeX、不重新导出图片时，可设置 `SKIP_FIGURE_EXPORT=1`。

编译脚本会从 `version.tex` 读取 `\thesisVersion`，并把产物输出到 `out/<版本号>/`，例如 `out/v1.0.0/main.pdf`。如果版本号包含 Windows 非法路径字符，脚本会自动替换为 `_` 后再作为目录名使用。

编译完成后脚本会自动打开当前版本目录下的 PDF。如果只想生成 PDF、不自动打开，可设置 `OPEN_PDF=0`。

## 编译方式

macOS:

```bash
zsh scripts/compile-latex-macos.sh
```

如未将 draw.io 加入 PATH，可指定应用内可执行文件：

```bash
DRAWIO_CLI=/Applications/draw.io.app/Contents/MacOS/draw.io zsh scripts/compile-latex-macos.sh
```

提高导出倍率：

```bash
DRAWIO_SCALE=4 zsh scripts/compile-latex-macos.sh
```

只编译不自动打开 PDF：

```bash
OPEN_PDF=0 zsh scripts/compile-latex-macos.sh
```

Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts/compile-latex-windows.ps1
```

如未将 draw.io 加入 PATH，可指定安装路径：

```powershell
$env:DRAWIO_CLI = "C:\Program Files\draw.io\draw.io.exe"
powershell.exe -ExecutionPolicy Bypass -File scripts/compile-latex-windows.ps1
```

提高导出倍率：

```powershell
$env:DRAWIO_SCALE = "4"
powershell.exe -ExecutionPolicy Bypass -File scripts/compile-latex-windows.ps1
```

只编译不自动打开 PDF：

```powershell
$env:OPEN_PDF = "0"
powershell.exe -ExecutionPolicy Bypass -File scripts\compile-latex-windows.ps1
```

两种脚本都会在 `papers/Latex-Mine` 下按 `xelatex -> biber -> xelatex -> xelatex` 的顺序生成 `main.pdf`。

## 版本管理

修改论文版本号时，只需要编辑 `version.tex`：

```tex
\newcommand{\thesisVersion}{v1.0.1}
```

下次编译后，论文封面会显示新版本号，产物会输出到对应目录：

```text
out/v1.0.1/main.pdf
```
