const debugMode = true;

export function debugLog(message: string, localSwitch: boolean = true) {
    if (debugMode && localSwitch) {
        console.log(`[DEBUG]\n ${message}`);
    }
}