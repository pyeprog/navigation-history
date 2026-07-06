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

    get tracingUri(): vscode.Uri {
        // each segment is encoded so that symbol names containing '/', '#', '?' and
        // windows-style paths cannot break the uri structure or collide with each other
        const segments = [
            this.uri.fsPath,
            this.name,
            String(this.kind),
            `${this.range.start.line}-${this.range.start.character}-${this.range.end.line}-${this.range.end.character}`,
        ];
        return vscode.Uri.from({ scheme: 'tracableSymbol', path: '/' + segments.map(encodeURIComponent).join('/') });
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
    
    static isTypeOf(obj?: any): obj is TracableSymbol {
        return obj instanceof TracableSymbol;
    }

    static createFrom(uri: vscode.Uri, symbol: vscode.DocumentSymbol | TracableSymbol, parent?: TracableSymbol): TracableSymbol {
        if (TracableSymbol.isTypeOf(symbol)) {
            // if the symbol has parent, then we leave it alone, otherwise we set it to the parent
            let tracableSymbol = symbol as TracableSymbol;
            tracableSymbol.parent = tracableSymbol.parent || parent;
            return tracableSymbol;
        }

        let tracableSymbol = new TracableSymbol(uri, symbol.name, symbol.detail, symbol.kind, symbol.range, symbol.selectionRange, [], parent);
        symbol.children.forEach(child => {
            tracableSymbol.children.push(TracableSymbol.createFrom(uri, child, tracableSymbol));
        });

        return tracableSymbol;
    }
}
