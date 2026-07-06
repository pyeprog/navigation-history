import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArrivalRecorder } from '../arrivalRecorder';
import { ArrivalCollection } from '../arrivalCollection';
import { Arrival } from '../arrival';
import { TracableSymbol } from '../tracableSymbol';
import { makeSymbol } from './testUtil';

function arrivalOn(symbol: TracableSymbol, word: string): Arrival {
    return new Arrival(symbol, word);
}

suite('ArrivalRecorder', () => {
    let collection: ArrivalCollection;
    let recorder: ArrivalRecorder;

    setup(() => {
        collection = new ArrivalCollection();
        recorder = new ArrivalRecorder(collection);
    });

    test('first arrival creates a new tree', () => {
        const barSymbol = makeSymbol({ name: 'bar', startLine: 10, endLine: 20 });
        const recorded = recorder.record(arrivalOn(barSymbol, 'bar'));

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(recorded.symbol, barSymbol);
    });

    test('revisiting the same symbol counts an encore instead of adding a node', () => {
        const barSymbol = makeSymbol({ name: 'bar', startLine: 10, endLine: 20 });
        const firstArrival = arrivalOn(barSymbol, 'bar');
        recorder.record(firstArrival);

        const recorded = recorder.record(arrivalOn(barSymbol, 'other'));

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(recorded, firstArrival);
        assert.strictEqual(firstArrival.selfEncoreCount, 1);
    });

    test('drilling into a function adds it as a child of the caller', () => {
        const barSymbol = makeSymbol({ name: 'bar', startLine: 10, endLine: 20 });
        const fooSymbol = makeSymbol({ name: 'foo', startLine: 30, endLine: 40 });

        recorder.record(arrivalOn(barSymbol, 'bar'));
        // cursor lands on the word 'foo' inside bar
        recorder.record(arrivalOn(barSymbol, 'foo'));
        // then jumps to the definition of foo
        const drilled = recorder.record(arrivalOn(fooSymbol, 'foo'));

        assert.strictEqual(collection.length, 1);
        const root = collection.at(0);
        assert.strictEqual(root.children.length, 1);
        assert.strictEqual(root.children[0], drilled);
        assert.strictEqual(root.children[0].symbol, fooSymbol);
    });

    test('drilling in still records when the caller lives in an older tree', () => {
        // regression test: the drill-in branches used to abort the whole recording
        // when the latest arrival was not found in the newest tree
        const barSymbol = makeSymbol({ name: 'bar', startLine: 10, endLine: 20 });
        const bazSymbol = makeSymbol({ name: 'baz', startLine: 50, endLine: 60 });
        const fooSymbol = makeSymbol({ name: 'foo', startLine: 80, endLine: 90 });

        recorder.record(arrivalOn(barSymbol, 'bar'));    // tree 1: bar
        recorder.record(arrivalOn(bazSymbol, 'baz'));    // tree 2: baz
        recorder.record(arrivalOn(barSymbol, 'foo'));    // back inside bar (older tree), on word 'foo'
        const drilled = recorder.record(arrivalOn(fooSymbol, 'foo'));  // jump to foo's definition

        assert.strictEqual(collection.length, 2);
        const barTree = collection.at(0);
        assert.strictEqual(barTree.symbol, barSymbol);
        assert.strictEqual(barTree.children.length, 1, 'foo must be recorded under bar, not dropped');
        assert.strictEqual(barTree.children[0], drilled);
    });

    test('C-style names with parameter lists still match the word under cursor', () => {
        const callerSymbol = makeSymbol({ name: 'main', startLine: 10, endLine: 20 });
        const calleeSymbol = makeSymbol({ name: 'foo(int a, char b)', startLine: 30, endLine: 40 });

        recorder.record(arrivalOn(callerSymbol, 'main'));
        recorder.record(arrivalOn(callerSymbol, 'foo'));
        recorder.record(arrivalOn(calleeSymbol, 'foo'));

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(collection.at(0).children.length, 1);
    });

    test('editing a symbol replaces it in place without a new node or encore', () => {
        const funcSymbol = makeSymbol({ name: 'func', startLine: 10, endLine: 20 });
        const firstArrival = arrivalOn(funcSymbol, 'func');
        recorder.record(firstArrival);

        // after editing, the symbol keeps its start position but name/end change
        const editedSymbol = new TracableSymbol(
            funcSymbol.uri, 'funcRenamed', '', funcSymbol.kind,
            new vscode.Range(10, 0, 22, 1), new vscode.Range(10, 0, 10, 11),
        );
        const recorded = recorder.record(arrivalOn(editedSymbol, 'funcRenamed'));

        assert.strictEqual(collection.length, 1);
        assert.strictEqual(recorded, firstArrival);
        assert.strictEqual(firstArrival.symbol, editedSymbol);
        assert.strictEqual(firstArrival.selfEncoreCount, 0);
    });

    test('landing on a sub-symbol of a recorded symbol appends it under the ancestor', () => {
        const classSymbol = makeSymbol({ name: 'MyClass', kind: vscode.SymbolKind.Class, startLine: 0, endLine: 50 });
        const method1 = makeSymbol({ name: 'method1', kind: vscode.SymbolKind.Method, startLine: 10, endLine: 20, parent: classSymbol });
        const method2 = makeSymbol({ name: 'method2', kind: vscode.SymbolKind.Method, startLine: 30, endLine: 40, parent: classSymbol });

        recorder.record(arrivalOn(method1, 'method1'));
        const recorded = recorder.record(arrivalOn(method2, 'method2'));

        assert.strictEqual(collection.length, 1);
        const classArrival = collection.at(0);
        assert.strictEqual(classArrival.symbol, classSymbol);
        assert.strictEqual(classArrival.children.length, 2);
        assert.strictEqual(classArrival.children[1], recorded);
    });

    test('moving to an unrelated symbol starts a new tree', () => {
        recorder.record(arrivalOn(makeSymbol({ name: 'bar', startLine: 10, endLine: 20 }), 'bar'));
        recorder.record(arrivalOn(makeSymbol({ name: 'unrelated', startLine: 50, endLine: 60 }), 'unrelated'));

        assert.strictEqual(collection.length, 2);
    });

    test('clear empties the collection and forgets the latest arrival', () => {
        const barSymbol = makeSymbol({ name: 'bar', startLine: 10, endLine: 20 });
        const fooSymbol = makeSymbol({ name: 'foo', startLine: 30, endLine: 40 });
        recorder.record(arrivalOn(barSymbol, 'foo'));

        recorder.clear();
        assert.strictEqual(collection.length, 0);

        // without a latest arrival this must open a new tree, not drill in
        recorder.record(arrivalOn(fooSymbol, 'foo'));
        assert.strictEqual(collection.length, 1);
        assert.strictEqual(collection.at(0).children.length, 0);
    });
});
