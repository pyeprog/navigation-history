import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArrivalCollection } from '../arrivalCollection';
import { Arrival } from '../arrival';
import { makeArrival, makeSymbol } from './testUtil';

function makeChangeEvent(file: string, changes: Array<{ startLine: number, endLine: number, text: string }>): vscode.TextDocumentChangeEvent {
    return {
        document: { uri: vscode.Uri.file(file) },
        contentChanges: changes.map(change => ({
            range: new vscode.Range(change.startLine, 0, change.endLine, 0),
            text: change.text,
        })),
    } as unknown as vscode.TextDocumentChangeEvent;
}

suite('ArrivalCollection', () => {
    test('at supports negative indices and throws when out of bounds', () => {
        const collection = new ArrivalCollection();
        const first = makeArrival({ name: 'first', startLine: 0 });
        const second = makeArrival({ name: 'second', startLine: 10 });
        collection.push(first);
        collection.push(second);

        assert.strictEqual(collection.at(0), first);
        assert.strictEqual(collection.at(-1), second);
        assert.throws(() => collection.at(2));
        assert.throws(() => collection.at(-3));
    });

    test('delete removes a child arrival from its parent by object identity', () => {
        const collection = new ArrivalCollection();
        const root = makeArrival({ name: 'root', startLine: 0, endLine: 50 });
        const child = makeArrival({ name: 'child', startLine: 10 });
        root.addChild(child);
        collection.push(root);

        collection.delete(child);

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(root.children.length, 0);
    });

    test('delete of a child does not remove another tree whose root has the same symbol', () => {
        const collection = new ArrivalCollection();
        const root = makeArrival({ name: 'root', startLine: 0, endLine: 50 });
        const child = makeArrival({ name: 'shared', startLine: 10 });
        root.addChild(child);
        // an independent tree on the very same symbol as the child
        const otherTree = new Arrival(makeSymbol({ name: 'shared', startLine: 10 }), 'shared');
        collection.push(root);
        collection.push(otherTree);

        collection.delete(child);

        assert.strictEqual(root.children.length, 0);
        assert.strictEqual(collection.length, 2, 'the independent tree must survive');
    });

    test('delete removes a root tree', () => {
        const collection = new ArrivalCollection();
        const root = makeArrival({ name: 'root', startLine: 0 });
        collection.push(root);

        collection.delete(root);

        assert.strictEqual(collection.length, 0);
    });

    test('deleteOtherTrees keeps only the tree of the given arrival', () => {
        const collection = new ArrivalCollection();
        const root1 = makeArrival({ name: 'root1', startLine: 0, endLine: 50 });
        const child = makeArrival({ name: 'child', startLine: 10 });
        root1.addChild(child);
        const root2 = makeArrival({ name: 'root2', startLine: 100 });
        collection.push(root1);
        collection.push(root2);

        collection.deleteOtherTrees(child);

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(collection.at(0), root1);
    });

    test('getByTracingUri finds nested arrivals', () => {
        const collection = new ArrivalCollection();
        const root = makeArrival({ name: 'root', startLine: 0, endLine: 50 });
        const child = makeArrival({ name: 'child', startLine: 10 });
        root.addChild(child);
        collection.push(root);

        assert.strictEqual(collection.getByTracingUri(child.symbol.tracingUri), child);
        assert.strictEqual(collection.getByTracingUri(makeSymbol({ name: 'missing', startLine: 99 }).tracingUri), null);
    });

    suite('applyDocumentChanges', () => {
        test('shifts symbols below an inserted line range', () => {
            const collection = new ArrivalCollection();
            const arrival = makeArrival({ name: 'foo', startLine: 10, endLine: 20 });
            collection.push(arrival);

            const shifted = collection.applyDocumentChanges(makeChangeEvent('/test/file.ts', [
                { startLine: 5, endLine: 5, text: '\n\n' },
            ]));

            assert.strictEqual(shifted, true);
            assert.strictEqual(arrival.symbol.range.start.line, 12);
            assert.strictEqual(arrival.symbol.range.end.line, 22);
            assert.strictEqual(arrival.symbol.selectionRange.start.line, 12);
        });

        test('extends only the end of a symbol when lines are inserted inside it', () => {
            const collection = new ArrivalCollection();
            const arrival = makeArrival({ name: 'foo', startLine: 10, endLine: 20 });
            collection.push(arrival);

            collection.applyDocumentChanges(makeChangeEvent('/test/file.ts', [
                { startLine: 15, endLine: 15, text: '\n' },
            ]));

            assert.strictEqual(arrival.symbol.range.start.line, 10);
            assert.strictEqual(arrival.symbol.range.end.line, 21);
        });

        test('shifts symbols up when lines are removed above them', () => {
            const collection = new ArrivalCollection();
            const arrival = makeArrival({ name: 'foo', startLine: 10, endLine: 20 });
            collection.push(arrival);

            collection.applyDocumentChanges(makeChangeEvent('/test/file.ts', [
                { startLine: 2, endLine: 5, text: '' },
            ]));

            assert.strictEqual(arrival.symbol.range.start.line, 7);
            assert.strictEqual(arrival.symbol.range.end.line, 17);
        });

        test('ignores edits without line changes and edits in other files', () => {
            const collection = new ArrivalCollection();
            const arrival = makeArrival({ name: 'foo', startLine: 10, endLine: 20 });
            collection.push(arrival);

            const typingShift = collection.applyDocumentChanges(makeChangeEvent('/test/file.ts', [
                { startLine: 1, endLine: 1, text: 'abc' },
            ]));
            const otherFileShift = collection.applyDocumentChanges(makeChangeEvent('/test/other.ts', [
                { startLine: 1, endLine: 1, text: '\n' },
            ]));

            assert.strictEqual(typingShift, false);
            assert.strictEqual(otherFileShift, false);
            assert.strictEqual(arrival.symbol.range.start.line, 10);
        });

        test('shifts shared parent symbols exactly once', () => {
            const collection = new ArrivalCollection();
            const parentSymbol = makeSymbol({ name: 'parent', startLine: 10, endLine: 40 });
            const childSymbol = makeSymbol({ name: 'child', startLine: 12, endLine: 20, parent: parentSymbol });
            const parentArrival = new Arrival(parentSymbol, 'parent');
            const childArrival = new Arrival(childSymbol, 'child');
            parentArrival.addChild(childArrival);
            collection.push(parentArrival);

            collection.applyDocumentChanges(makeChangeEvent('/test/file.ts', [
                { startLine: 0, endLine: 0, text: '\n' },
            ]));

            assert.strictEqual(parentSymbol.range.start.line, 11);
            assert.strictEqual(childSymbol.range.start.line, 13);
        });
    });
});
