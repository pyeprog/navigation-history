import * as vscode from 'vscode';

export class TracableSymbol extends vscode.DocumentSymbol {
    children: TracableSymbol[];
    parent: TracableSymbol | undefined | null;

    constructor(name: string, detail: string, kind: vscode.SymbolKind, range: vscode.Range, selectionRange: vscode.Range, children?: TracableSymbol[], parent?: TracableSymbol) {
        super(name, detail, kind, range, selectionRange);
        this.children = children || [];
        this.parent = parent || null;
    }

    static createFrom(symbol: vscode.DocumentSymbol, parent?: TracableSymbol): TracableSymbol {
        if (symbol instanceof TracableSymbol) {
            // if the symbol has parent, then we leave it alone, otherwise we set it to the parent
            symbol.parent = symbol.parent || parent;
            return symbol;
        }

        let tracableSymbol = new TracableSymbol(symbol.name, symbol.detail, symbol.kind, symbol.range, symbol.selectionRange, [], parent);
        symbol.children.forEach(child => {
            tracableSymbol.children.push(TracableSymbol.createFrom(child, tracableSymbol));
        });

        return tracableSymbol;
    }
}
