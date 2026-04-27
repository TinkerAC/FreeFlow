import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync,} from 'node:fs';
import path from 'node:path';

const scriptDir = __dirname;
const thesisDir = path.resolve(scriptDir, '..');
const outRootDir = path.join(thesisDir, 'out');
const figuresDir = path.join(thesisDir, 'figures');
const figuresOutDir = path.join(figuresDir, 'out');
const versionFile = path.join(thesisDir, 'version.tex');
const mainTexPath = path.join(thesisDir, 'main.tex');

// Default switches: edit these values directly when you want persistent local behavior.
const defaultOptions = {
    reExportFigures: false,//是否重新导出图片
    openPdfAfterBuild: true,//编译完成后是否打开
    drawioScale: '3',
    drawioBorder: '10',
    drawioExtraArgs: '',
    macosCtexFontset: 'fandol',
} as const;

const scriptOptions = {
    reExportFigures: readBooleanEnv('SKIP_FIGURE_EXPORT', defaultOptions.reExportFigures, {
        invert: true,
    }),
    openPdfAfterBuild: readBooleanEnv('OPEN_PDF', defaultOptions.openPdfAfterBuild),
    drawioScale: process.env.DRAWIO_SCALE ?? defaultOptions.drawioScale,
    drawioBorder: process.env.DRAWIO_BORDER ?? defaultOptions.drawioBorder,
    drawioExtraArgs: parseEnvArgs(process.env.DRAWIO_EXTRA_ARGS ?? defaultOptions.drawioExtraArgs),
    macosCtexFontset: process.env.LATEX_CTEX_FONTSET ?? defaultOptions.macosCtexFontset,
} as const;

main();

function main(): void {
    const thesisVersion = readThesisVersion();
    const outDir = path.join(outRootDir, sanitizeVersionForDir(thesisVersion));

    mkdirSync(outDir, {recursive: true});

    console.log(`Building thesis version ${thesisVersion} -> ${outDir}`);

    exportDrawioFigures();

    const ctexFontset = resolveCtexFontset();
    const bootstrap = prepareLatexEntry(ctexFontset);

    try {
        runLatexPass(bootstrap.entryPath, outDir);
        runCommand('biber', ['--input-directory', outDir, '--output-directory', outDir, 'main'], {
            cwd: thesisDir,
        });
        runLatexPass(bootstrap.entryPath, outDir);
        runLatexPass(bootstrap.entryPath, outDir);
    } finally {
        bootstrap.cleanup();
    }

    const pdfPath = path.join(outDir, 'main.pdf');
    if (!existsSync(pdfPath)) {
        throw new Error(`Compilation finished but PDF was not found: ${pdfPath}`);
    }

    if (scriptOptions.openPdfAfterBuild) {
        openFile(pdfPath);
    }
}

function readThesisVersion(): string {
    if (!existsSync(versionFile)) {
        throw new Error(`Version file not found: ${versionFile}`);
    }

    const rawContent = readFileSync(versionFile, 'utf8');
    const match = rawContent.match(/\\newcommand\{\\thesisVersion\}\{([^}]*)\}/);
    if (!match?.[1]) {
        throw new Error(`Unable to read \\thesisVersion from ${versionFile}`);
    }

    return match[1];
}

function sanitizeVersionForDir(version: string): string {
    return version.replace(/[\\/:*?"<>| ]/g, '_');
}

function exportDrawioFigures(): void {
    mkdirSync(figuresOutDir, {recursive: true});

    const drawioFiles = readdirSync(figuresDir, {withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith('.drawio'))
        .map((entry) => path.join(figuresDir, entry.name));

    if (drawioFiles.length === 0) {
        return;
    }

    if (!scriptOptions.reExportFigures) {
        console.warn('Skipping draw.io figure export because reExportFigures=false.');
        return;
    }

    const drawioCli = findDrawioCli();
    for (const sourceFile of drawioFiles) {
        const outputFile = path.join(figuresOutDir, `${path.parse(sourceFile).name}.png`);
        console.log(
            `Exporting ${path.basename(sourceFile)} -> ${outputFile} (scale=${scriptOptions.drawioScale}, border=${scriptOptions.drawioBorder})`,
        );
        exportDrawioFigure(drawioCli, sourceFile, outputFile);
    }
}

function findDrawioCli(): string {
    const configured = process.env.DRAWIO_CLI?.trim();
    if (configured) {
        const resolved = resolveExecutable(configured);
        if (resolved) {
            return resolved;
        }
        throw new Error(`DRAWIO_CLI is set but was not found or is not executable: ${configured}`);
    }

    const commandCandidates =
        process.platform === 'win32'
            ? ['drawio.exe', 'draw.io.exe', 'diagrams.net.exe', 'drawio', 'draw.io', 'diagrams.net']
            : ['drawio', 'draw.io', 'diagrams.net'];

    for (const candidate of commandCandidates) {
        const resolved = resolveExecutable(candidate);
        if (resolved) {
            return resolved;
        }
    }

    const pathCandidates =
        process.platform === 'win32'
            ? [
                'D:\\DrawIO\\draw.io\\draw.io.exe',
                'D:\\DrawIO\\draw.io\\drawio.exe',
                'D:\\DrawIO\\draw.io\\diagrams.net.exe',
                path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'draw.io', 'draw.io.exe'),
                path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'diagrams.net', 'diagrams.net.exe'),
                path.join(process.env.ProgramFiles ?? '', 'draw.io', 'draw.io.exe'),
                path.join(process.env.ProgramFiles ?? '', 'diagrams.net', 'diagrams.net.exe'),
                path.join(process.env['ProgramFiles(x86)'] ?? '', 'draw.io', 'draw.io.exe'),
                path.join(process.env['ProgramFiles(x86)'] ?? '', 'diagrams.net', 'diagrams.net.exe'),
            ]
            : [
                '/Applications/draw.io.app/Contents/MacOS/draw.io',
                '/Applications/diagrams.net.app/Contents/MacOS/diagrams.net',
            ];

    for (const candidate of pathCandidates) {
        if (!candidate) {
            continue;
        }
        const resolved = resolveExecutable(candidate);
        if (resolved) {
            return resolved;
        }
    }

    const examples =
        process.platform === 'win32'
            ? [
                'Install diagrams.net Desktop, add draw.io.exe to PATH, or set DRAWIO_CLI to the executable path.',
                'Windows example:',
                '  $env:DRAWIO_CLI = "D:\\DrawIO\\draw.io\\draw.io.exe"',
                '  powershell.exe -ExecutionPolicy Bypass -File scripts\\compile-latex-windows.ps1',
            ]
            : [
                'Install diagrams.net Desktop, or set DRAWIO_CLI to the executable path.',
                'macOS examples:',
                '  brew install --cask drawio',
                '  DRAWIO_CLI=/Applications/draw.io.app/Contents/MacOS/draw.io zsh scripts/compile-latex-macos.sh',
            ];

    throw new Error(
        [
            'Unable to find diagrams.net/draw.io command line exporter.',
            '',
            ...examples,
            '',
            'To compile LaTeX without regenerating figures, run:',
            process.platform === 'win32'
                ? '  $env:SKIP_FIGURE_EXPORT = "1"'
                : '  SKIP_FIGURE_EXPORT=1 zsh scripts/compile-latex-macos.sh',
        ].join('\n'),
    );
}

function exportDrawioFigure(drawioCli: string, sourceFile: string, outputFile: string): void {
    const baseArgs = [...scriptOptions.drawioExtraArgs];
    const longArgs = [
        '--export',
        '--format',
        'png',
        '--scale',
        scriptOptions.drawioScale,
        '--border',
        scriptOptions.drawioBorder,
        '--output',
        outputFile,
        sourceFile,
    ];
    const shortArgs = [
        '-x',
        '-f',
        'png',
        '-s',
        scriptOptions.drawioScale,
        '-b',
        scriptOptions.drawioBorder,
        '-o',
        outputFile,
        sourceFile,
    ];

    const attempts = [longArgs, shortArgs];
    let lastError: Error | null = null;

    for (const args of attempts) {
        rmSync(outputFile, {force: true});

        try {
            runCommand(drawioCli, [...baseArgs, ...args], {cwd: thesisDir, allowAbsoluteCommand: true});
            if (existsSync(outputFile)) {
                return;
            }
            lastError = new Error(`draw.io exited successfully but did not create ${outputFile}`);
        } catch (error) {
            lastError = toError(error);
        }
    }

    throw lastError ?? new Error(`draw.io export failed for ${sourceFile}`);
}

function resolveCtexFontset(): string | null {
    const requested = scriptOptions.macosCtexFontset.trim();
    if (requested) {
        return requested.toLowerCase() === 'auto' ? null : requested;
    }

    return process.platform === 'darwin' ? defaultOptions.macosCtexFontset : null;
}

function prepareLatexEntry(fontset: string | null): { entryPath: string; cleanup: () => void } {
    if (!fontset) {
        return {entryPath: mainTexPath, cleanup: () => undefined};
    }

    const bootstrapPath = path.join(scriptDir, `compile-latex-bootstrap-${process.pid}.tex`);
    const bootstrapContent = `\\PassOptionsToClass{fontset=${fontset}}{ctexbook}\n\\input{main.tex}\n`;
    writeFileSync(bootstrapPath, bootstrapContent, 'utf8');
    console.log(`Using temporary ctex fontset override: ${fontset}`);

    return {
        entryPath: bootstrapPath,
        cleanup: () => {
            try {
                unlinkSync(bootstrapPath);
            } catch {
                // Ignore cleanup errors for temporary bootstrap files.
            }
        },
    };
}

function runLatexPass(entryPath: string, outDir: string): void {
    runCommand(
        'xelatex',
        ['-interaction=nonstopmode', '-halt-on-error', '-jobname=main', `-output-directory=${outDir}`, entryPath],
        {cwd: thesisDir},
    );
}

function openFile(filePath: string): void {
    if (process.platform === 'darwin') {
        runCommand('open', [filePath], {cwd: thesisDir});
        return;
    }

    if (process.platform === 'win32') {
        runCommand('cmd', ['/c', 'start', '', filePath], {cwd: thesisDir});
        return;
    }

    runCommand('xdg-open', [filePath], {cwd: thesisDir});
}

function runCommand(
    command: string,
    args: string[],
    options: { cwd: string; allowAbsoluteCommand?: boolean },
): void {
    const resolvedCommand = options.allowAbsoluteCommand ? command : resolveCommandOrThrow(command);
    const result = spawnSync(resolvedCommand, args, {
        cwd: options.cwd,
        stdio: 'inherit',
        env: process.env,
        shell: false,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${path.basename(command)} failed with exit code ${result.status ?? 'unknown'}`);
    }
}

function resolveCommandOrThrow(command: string): string {
    const resolved = resolveExecutable(command);
    if (!resolved) {
        throw new Error(`${command} was not found in PATH. Please install it and ensure it is available in PATH.`);
    }
    return resolved;
}

function resolveExecutable(command: string): string | null {
    if (path.isAbsolute(command) || command.includes(path.sep)) {
        return existsSync(command) ? command : null;
    }

    const pathValue = process.env.PATH ?? '';
    const directories = pathValue.split(path.delimiter).filter(Boolean);
    const extensions = process.platform === 'win32'
        ? (process.env.PATHEXT?.split(';').filter(Boolean) ?? ['.EXE', '.CMD', '.BAT', '.COM'])
        : [''];

    for (const directory of directories) {
        for (const extension of extensions) {
            const candidate = path.join(directory, process.platform === 'win32' ? withWindowsExtension(command, extension) : command);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return null;
}

function withWindowsExtension(command: string, extension: string): string {
    const normalizedExtension = extension.toLowerCase();
    return command.toLowerCase().endsWith(normalizedExtension) ? command : `${command}${extension}`;
}

function parseEnvArgs(rawValue: string | undefined): string[] {
    if (!rawValue?.trim()) {
        return [];
    }

    const result: string[] = [];
    let current = '';
    let quote: '"' | "'" | null = null;

    for (let index = 0; index < rawValue.length; index += 1) {
        const char = rawValue[index];

        if (quote) {
            if (char === quote) {
                quote = null;
            } else if (char === '\\' && quote === '"' && index + 1 < rawValue.length) {
                current += rawValue[index + 1];
                index += 1;
            } else {
                current += char;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }

        if (/\s/.test(char)) {
            if (current) {
                result.push(current);
                current = '';
            }
            continue;
        }

        current += char;
    }

    if (current) {
        result.push(current);
    }

    return result;
}

function readBooleanEnv(
    envName: string,
    defaultValue: boolean,
    options?: { invert?: boolean },
): boolean {
    const rawValue = process.env[envName]?.trim().toLowerCase();
    if (!rawValue) {
        return defaultValue;
    }

    const truthyValues = new Set(['1', 'true', 'yes', 'on']);
    const falsyValues = new Set(['0', 'false', 'no', 'off']);

    let parsedValue: boolean;
    if (truthyValues.has(rawValue)) {
        parsedValue = true;
    } else if (falsyValues.has(rawValue)) {
        parsedValue = false;
    } else {
        throw new Error(`Invalid boolean env ${envName}=${rawValue}. Use 1/0/true/false/yes/no/on/off.`);
    }

    return options?.invert ? !parsedValue : parsedValue;
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}
