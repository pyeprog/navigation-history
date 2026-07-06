import * as assert from 'assert';
import { Arrival } from '../arrival';
import { makeArrival, makeSymbol } from './testUtil';

suite('Arrival', () => {
    test('addChild links parent and child', () => {
        const parent = makeArrival({ name: 'parent', startLine: 0 });
        const child = makeArrival({ name: 'child', startLine: 10 });

        parent.addChild(child);

        assert.strictEqual(parent.children.length, 1);
        assert.strictEqual(child.parent, parent);
    });

    test('addChild does not add a second child with the same symbol', () => {
        const parent = makeArrival({ name: 'parent', startLine: 0 });
        const child = makeArrival({ name: 'child', startLine: 10 });
        const childDuplicate = new Arrival(makeSymbol({ name: 'child', startLine: 10 }), 'child');

        parent.addChild(child);
        parent.addChild(childDuplicate);

        assert.strictEqual(parent.children.length, 1);
    });

    test('addChild accepts children with different symbols', () => {
        const parent = makeArrival({ name: 'parent', startLine: 0 });
        parent.addChild(makeArrival({ name: 'child1', startLine: 10 }));
        parent.addChild(makeArrival({ name: 'child2', startLine: 20 }));

        assert.strictEqual(parent.children.length, 2);
    });

    test('removeChild removes exactly the given child instance', () => {
        const parent = makeArrival({ name: 'parent', startLine: 0 });
        const child1 = makeArrival({ name: 'child1', startLine: 10 });
        const child2 = makeArrival({ name: 'child2', startLine: 20 });
        parent.addChild(child1);
        parent.addChild(child2);

        parent.removeChild(child1);

        assert.deepStrictEqual(parent.children, [child2]);
        assert.strictEqual(child1.parent, undefined);
    });

    test('root walks up to the tree root', () => {
        const root = makeArrival({ name: 'root', startLine: 0 });
        const middle = makeArrival({ name: 'middle', startLine: 10 });
        const leaf = makeArrival({ name: 'leaf', startLine: 20 });
        root.addChild(middle);
        middle.addChild(leaf);

        assert.strictEqual(leaf.root, root);
        assert.strictEqual(root.root, root);
    });

    test('treeEncoreCount sums the whole subtree', () => {
        const root = makeArrival({ name: 'root', startLine: 0 });
        const child = makeArrival({ name: 'child', startLine: 10 });
        root.addChild(child);

        root.encore();
        child.encore();
        child.encore();

        assert.strictEqual(root.selfEncoreCount, 1);
        assert.strictEqual(root.treeEncoreCount, 3);
    });
});
