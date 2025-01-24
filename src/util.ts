import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';
import { Arrival } from './arrival';
import { debugLog } from './debug';
import assert from 'assert';


export async function extractSymbols(doc: vscode.TextDocument, position: vscode.Position): Promise<TracableSymbol | null> {
    function findSymbol(symbols: TracableSymbol[], position: vscode.Position): TracableSymbol | null {
        for (const symbol of symbols) {
            // symbol might be undefine, thus we must filter out these undefine.
            if (!symbol || !symbol.range.contains(position)) {
                continue;
            }

            let childSymbol: TracableSymbol | null = null;
            if (symbol.children) {
                childSymbol = findSymbol(symbol.children, position);
            }

            // it's possible that cursor sits at parent symbol, but not in every child symbol
            // thus if none childSymbol found, return the parent symbol.
            return childSymbol || symbol;
        }

        return null;
    }

    const symbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
    );
    const tracableSymbols: TracableSymbol[] = symbols.map(symbol => TracableSymbol.createFrom(doc.uri, symbol));

    return findSymbol(tracableSymbols, position);
}


export async function parseArrivalFromEditorState(editor: vscode.TextEditor) {
    // only pick the first selection, if there are multiple selections, we treat first selection as the pivot
    // const position = event.selections[0].anchor;
    const position = editor.selections[0].anchor;

    // when cursor on space or punctuations like '=', wordRange would be undefined
    const wordRange = editor.document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return;
    }

    // get the word at the position, which might be different from the symbol at the position
    // this is because when cursor is on the word in a function, the symbol is the function, but the word is the inner word of the function
    const word = editor.document.getText(wordRange);

    // get the symbol at the position
    const symbol = await extractSymbols(editor.document, position);
    if (!symbol) {
        return;
    }

    debugLog(`On Word: ${word}  On Symbol: ${symbol.name}`, false);

    return Arrival.createFrom({
        symbol: symbol,
        word: word,
    });

}


export function productIconPath(kind: vscode.SymbolKind): vscode.ThemeIcon {
    switch (kind) {
        case vscode.SymbolKind.File:
            return new vscode.ThemeIcon('symbol-file');
        case vscode.SymbolKind.Class:
            return new vscode.ThemeIcon('symbol-class');
        case vscode.SymbolKind.Method:
            return new vscode.ThemeIcon('symbol-method');
        case vscode.SymbolKind.Property:
            return new vscode.ThemeIcon('symbol-property');
        case vscode.SymbolKind.Field:
            return new vscode.ThemeIcon('symbol-field');
        case vscode.SymbolKind.Constructor:
            return new vscode.ThemeIcon('symbol-constructor');
        case vscode.SymbolKind.Enum:
            return new vscode.ThemeIcon('symbol-enum');
        case vscode.SymbolKind.Interface:
            return new vscode.ThemeIcon('symbol-interface');
        case vscode.SymbolKind.Function:
            return new vscode.ThemeIcon('symbol-function');
        case vscode.SymbolKind.Variable:
            return new vscode.ThemeIcon('symbol-variable');
        case vscode.SymbolKind.Constant:
            return new vscode.ThemeIcon('symbol-constant');
        case vscode.SymbolKind.String:
            return new vscode.ThemeIcon('symbol-string');
        case vscode.SymbolKind.Number:
            return new vscode.ThemeIcon('symbol-numeric');
        case vscode.SymbolKind.Boolean:
            return new vscode.ThemeIcon('symbol-boolean');
        case vscode.SymbolKind.Array:
            return new vscode.ThemeIcon('symbol-array');
        case vscode.SymbolKind.Object:
            return new vscode.ThemeIcon('symbol-object');
        case vscode.SymbolKind.Key:
            return new vscode.ThemeIcon('symbol-key');
        case vscode.SymbolKind.Null:
            return new vscode.ThemeIcon('symbol-null');
        case vscode.SymbolKind.EnumMember:
            return new vscode.ThemeIcon('symbol-enum-member');
        case vscode.SymbolKind.Struct:
            return new vscode.ThemeIcon('symbol-struct');
        case vscode.SymbolKind.Event:
            return new vscode.ThemeIcon('symbol-event');
        case vscode.SymbolKind.Operator:
            return new vscode.ThemeIcon('symbol-operator');
        case vscode.SymbolKind.TypeParameter:
            return new vscode.ThemeIcon('symbol-parameter');
        case vscode.SymbolKind.Module:
            return new vscode.ThemeIcon('symbol-module');
        case vscode.SymbolKind.Package:
            return new vscode.ThemeIcon('symbol-package');
        case vscode.SymbolKind.Namespace:
            return new vscode.ThemeIcon('symbol-namespace');
        default:
            return new vscode.ThemeIcon('symbol-misc');
    }
}


/**
 * color conversion from hsv to rgb hex
 * @param h hue, 0-360
 * @param s saturation, 0-1
 * @param v value, 0-1
 * @param alpha alpha, 0-1
 * @returns hex string of rgb, like #ffffff
 */
export function hsvToRgbaHex(h: number, s: number, v: number, alpha: number = 1): string {
    assert(h >= 0 && h <= 360, 'hue must be between 0 and 360');
    assert(s >= 0 && s <= 1, 'saturation must be between 0 and 1');
    assert(v >= 0 && v <= 1, 'value must be between 0 and 1');
    assert(alpha >= 0 && alpha <= 1, 'alpha must be between 0 and 1');

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    const r = (h < 60) ? c : (h < 120) ? x : (h < 180) ? 0 : (h < 240) ? x : (h < 300) ? c : 0;
    const g = (h < 60) ? x : (h < 120) ? c : (h < 180) ? x : (h < 240) ? 0 : (h < 300) ? x : c;
    const b = (h < 60) ? 0 : (h < 120) ? x : (h < 180) ? c : (h < 240) ? x : (h < 300) ? 0 : c;

    const redHex = Math.round(r + m).toString(16).padStart(2, '0');
    const greenHex = Math.round(g + m).toString(16).padStart(2, '0');
    const blueHex = Math.round(b + m).toString(16).padStart(2, '0');
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

    return `#${redHex}${greenHex}${blueHex}${alphaHex}`;
}
