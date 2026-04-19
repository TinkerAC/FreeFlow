# FreeFlow 本科毕业论文 LaTeX 工程

本目录用于编写 FreeFlow 项目的毕业论文正文，样板工程统一保留在 `papers/Latex-Template`。当前目录仅保留 FreeFlow 论文编译所需的类文件、封面资源、字体、参考文献文件和正文结构。

## 目录说明

- `main.tex`：论文编译入口。
- `zufe.cls`：学校论文格式类文件，已适配本项目随附中文字体。
- `chapters/`：论文正文、摘要、致谢、附录等内容。
- `misc/`：封面、原创性声明、参考文献等固定结构。
- `InitFile/`：学校名称和校徽图片。
- `Reference.bib`：FreeFlow 论文参考文献。
- `scripts/`：IDEA Run Configuration 调用的跨平台编译脚本。

## 编译方式

macOS:

```bash
zsh scripts/compile-latex-macos.sh
```

Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts/compile-latex-windows.ps1
```

两种脚本都会在 `papers/Latex-Mine` 下按 `xelatex -> biber -> xelatex -> xelatex` 的顺序生成 `main.pdf`。
