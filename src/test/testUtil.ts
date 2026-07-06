import * as vscode from 'vscode';
import { TracableSymbol } from '../tracableSymbol';
import { Arrival } from '../arrival';

export type SymbolSpec = {
    name: string;
    kind?: vscode.SymbolKind;
    file?: string;
    startLine?: number;
    endLine?: number;
    parent?: TracableSymbol;
};

export function makeSymbol(spec: SymbolSpec): TracableSymbol {
    const startLine = spec.startLine ?? 0;
    const endLine = spec.endLine ?? startLine + 5;
    const range = new vscode.Range(startLine, 0, endLine, 1);
    const selectionRange = new vscode.Range(startLine, 0, startLine, spec.name.length);
    const symbol = new TracableSymbol(
        vscode.Uri.file(spec.file ?? '/test/file.ts'),
        spec.name,
        '',
        spec.kind ?? vscode.SymbolKind.Function,
        range,
        selectionRange,
        [],
        spec.parent,
    );
    if (spec.parent) {
        spec.parent.children.push(symbol);
    }
    return symbol;
}

export function makeArrival(spec: SymbolSpec & { word?: string }): Arrival {
    const symbol = makeSymbol(spec);
    return new Arrival(symbol, spec.word ?? spec.name);
}
