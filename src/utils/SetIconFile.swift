import AppKit

func usage() {
    fputs("Usage: setfileicon <icon.icns|png|--clear> <target file or folder>\n", stderr)
}

let args = CommandLine.arguments
guard args.count == 3 else { usage(); exit(64) } // EX_USAGE

let iconArg = args[1]
let targetPath = (args[2] as NSString).expandingTildeInPath

if iconArg == "--clear" {
    let ok = NSWorkspace.shared.setIcon(nil, forFile: targetPath, options: [])
    exit(ok ? 0 : 1)
}

let iconPath = (iconArg as NSString).expandingTildeInPath
let url = URL(fileURLWithPath: iconPath)
guard let image = NSImage(contentsOf: url) ?? NSImage(byReferencing: url) else {
    fputs("error: cannot load icon at \(iconPath)\n", stderr)
    exit(66) // EX_NOINPUT
}

// 先清除再设置，可缓解 Finder 缓存导致的不刷新问题
_ = NSWorkspace.shared.setIcon(nil, forFile: targetPath, options: [])
let ok = NSWorkspace.shared.setIcon(image, forFile: targetPath, options: [])
exit(ok ? 0 : 1)