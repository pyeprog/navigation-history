import * as vscode from 'vscode';

// echo logs to the debug console as well when the extension host is launched
// with NAVIGATION_HISTORY_DEBUG=1
const consoleEcho = process.env.NAVIGATION_HISTORY_DEBUG === '1';

let channel: vscode.OutputChannel | undefined;

function outputChannel(): vscode.OutputChannel {
    if (!channel) {
        channel = vscode.window.createOutputChannel('Navigation History');
    }
    return channel;
}

/**
 * Log a noteworthy runtime event to the "Navigation History" output channel
 * (View -> Output), so silently ignored events stay diagnosable in production.
 */
export function logInfo(message: string) {
    outputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
    if (consoleEcho) {
        console.log(`[NavigationHistory] ${message}`);
    }
}

export function debugLog(message: string, localSwitch: boolean = true) {
    if (consoleEcho && localSwitch) {
        console.log(`[DEBUG]\n ${message}`);
    }
}
