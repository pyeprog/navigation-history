import * as assert from 'assert';
import * as vscode from 'vscode';
import { TracableSymbol } from '../tracableSymbol';
import { makeSymbol } from './testUtil';

suite('TracableSymbol', () => {
    test('isTypeOf recognizes TracableSymbol instances', () => {
        const symbol = makeSymbol({ name: 'foo' });
        assert.strictEqual(TracableSymbol.isTypeOf(symbol), true);
    });

    test('isTypeOf rejects plain DocumentSymbol, null and undefined', () => {
        const documentSymbol = new vscode.DocumentSymbol(
            'foo', '', vscode.SymbolKind.Function,
            new vscode.Range(0, 0, 1, 0), new vscode.Range(0, 0, 0, 3),
        );
        assert.strictEqual(TracableSymbol.isTypeOf(documentSymbol), false);
        assert.strictEqual(TracableSymbol.isTypeOf(undefined), false);
        assert.strictEqual(TracableSymbol.isTypeOf(null), false);
    });

    test('createFrom returns the same instance for an existing TracableSymbol and fills in its parent', () => {
        const parent = makeSymbol({ name: 'parent', startLine: 0, endLine: 20 });
        const symbol = makeSymbol({ name: 'child', startLine: 1, endLine: 5 });
        symbol.parent = null;

        const created = TracableSymbol.createFrom(symbol.uri, symbol, parent);

        assert.strictEqual(created, symbol);
        assert.strictEqual(created.parent, parent);
    });

    test('createFrom builds a TracableSymbol tree with parent links from a DocumentSymbol', () => {
        const child = new vscode.DocumentSymbol(
            'child', '', vscode.SymbolKind.Method,
            new vscode.Range(1, 0, 2, 0), new vscode.Range(1, 0, 1, 5),
        );
        const root = new vscode.DocumentSymbol(
            'root', '', vscode.SymbolKind.Class,
            new vscode.Range(0, 0, 10, 0), new vscode.Range(0, 0, 0, 4),
        );
        root.children.push(child);

        const created = TracableSymbol.createFrom(vscode.Uri.file('/test/file.ts'), root);

        assert.strictEqual(created.name, 'root');
        assert.strictEqual(created.children.length, 1);
        assert.strictEqual(created.children[0].name, 'child');
        assert.strictEqual(created.children[0].parent, created);
    });

    test('tracingUri is stable across calls', () => {
        const symbol = makeSymbol({ name: 'foo' });
        assert.strictEqual(symbol.tracingUri.toString(), symbol.tracingUri.toString());
    });

    test('tracingUri distinguishes symbols of different kinds at the same position', () => {
        const funcSymbol = makeSymbol({ name: 'foo', kind: vscode.SymbolKind.Function });
        const classSymbol = makeSymbol({ name: 'foo', kind: vscode.SymbolKind.Class });
        assert.notStrictEqual(funcSymbol.tracingUri.toString(), classSymbol.tracingUri.toString());
    });

    test('tracingUri survives special characters in symbol names', () => {
        const trickyName = 'operator/([a-z]+)#?';
        const symbol = makeSymbol({ name: trickyName });
        const plainSymbol = makeSymbol({ name: 'operator' });

        assert.notStrictEqual(symbol.tracingUri.toString(), plainSymbol.tracingUri.toString());
        // the encoded name must stay one single path segment
        const segments = symbol.tracingUri.path.split('/').filter(s => s.length > 0);
        assert.strictEqual(segments.length, 4);
        assert.strictEqual(decodeURIComponent(segments[1]), trickyName);
    });
});
