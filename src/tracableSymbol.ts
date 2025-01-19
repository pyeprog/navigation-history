import * as vscode from 'vscode';

export class TracableSymbol extends vscode.DocumentSymbol {
    uri: vscode.Uri;
    children: TracableSymbol[];
    parent: TracableSymbol | undefined | null;

    constructor(uri: vscode.Uri, name: string, detail: string, kind: vscode.SymbolKind, range: vscode.Range, selectionRange: vscode.Range, children?: TracableSymbol[], parent?: TracableSymbol) {
        super(name, detail, kind, range, selectionRange);
        this.uri = uri;
        this.children = children || [];
        this.parent = parent || null;
    }

    isEqual(other: TracableSymbol): boolean {
        return this.name === other.name
            && this.uri.fsPath === other.uri.fsPath
            && this.detail === other.detail
            && this.kind === other.kind
            && this.range.isEqual(other.range)
            && this.selectionRange.isEqual(other.selectionRange);
    }

    static createFrom(uri: vscode.Uri, symbol: vscode.DocumentSymbol, parent?: TracableSymbol): TracableSymbol {
        if (symbol instanceof TracableSymbol) {
            // if the symbol has parent, then we leave it alone, otherwise we set it to the parent
            symbol.parent = symbol.parent || parent;
            return symbol;
        }

        let tracableSymbol = new TracableSymbol(uri, symbol.name, symbol.detail, symbol.kind, symbol.range, symbol.selectionRange, [], parent);
        symbol.children.forEach(child => {
            tracableSymbol.children.push(TracableSymbol.createFrom(uri, child, tracableSymbol));
        });

        return tracableSymbol;
    }
}
