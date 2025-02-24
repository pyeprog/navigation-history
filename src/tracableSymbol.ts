import assert from 'assert';
import * as vscode from 'vscode';

export class TracableSymbol extends vscode.DocumentSymbol {
    uri: vscode.Uri;
    children: TracableSymbol[];
    parent: TracableSymbol | undefined | null;

    constructor(uri: vscode.Uri, name: string, detail: string, kind: vscode.SymbolKind, range: vscode.Range, selectionRange: vscode.Range, children?: TracableSymbol[], parent?: TracableSymbol) {
        assert(name, 'name is required to be a non-empty string, or Symbol is in ill format, and exception will be thrown');

        super(name, detail, kind, range, selectionRange);
        this.uri = uri;
        this.children = children || [];
        this.parent = parent || null;
    }
    
    static empty(): TracableSymbol {
        return new TracableSymbol(vscode.Uri.parse('delimiter'), 'delimiter', '', vscode.SymbolKind.File, new vscode.Range(0, 0, 0, 1), new vscode.Range(0, 0, 0, 1));
    }

    get tracingUri(): vscode.Uri {
        return vscode.Uri.parse(`tracableSymbol://${this.uri.fsPath}/${this.name}/${this.range.start.line}-${this.range.start.character}-${this.range.end.line}-${this.range.end.character}`);
    }
        
    hasSameStartPosition(other: TracableSymbol): boolean {
        return this.range.start.isEqual(other.range.start)
            && this.kind === other.kind
            && this.uri.fsPath === other.uri.fsPath;
    }
    
    hasSameEndPosition(other: TracableSymbol): boolean {
        return this.range.end.isEqual(other.range.end)
            && this.kind === other.kind
            && this.uri.fsPath === other.uri.fsPath;
    }

    isEqual(other: TracableSymbol | undefined | null): boolean {
        if (!other) {
            return false;
        }

        return this.name === other.name
            && this.detail === other.detail
            && this.hasSameStartPosition(other)
            && this.hasSameEndPosition(other)
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
