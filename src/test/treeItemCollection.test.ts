import * as assert from 'assert';
import { toTreeItemCollection, TreeViewReprOptions } from '../treeItemCollection';
import { ArrivalCollection } from '../arrivalCollection';
import { Arrival, Delimiter, HistoryPlaceholder, SectionDelimiter } from '../arrival';
import { makeArrival } from './testUtil';

function makeReprOptions(overrides: Partial<TreeViewReprOptions> = {}): TreeViewReprOptions {
    return {
        delimiterString: '─',
        enableDelimiter: false,
        sortField: 'time',
        sortOrder: 'descending',
        unpinHideThreshold: 20,
        hideHistory: false,
        showFilename: true,
        showPosition: true,
        ...overrides,
    };
}

function makeCollection(count: number): { collection: ArrivalCollection, arrivals: Arrival[] } {
    const collection = new ArrivalCollection();
    const arrivals: Arrival[] = [];
    for (let i = 0; i < count; i++) {
        const arrival = makeArrival({ name: `symbol${i}`, startLine: i * 10 });
        arrivals.push(arrival);
        collection.push(arrival);
    }
    return { collection, arrivals };
}

suite('toTreeItemCollection', () => {
    test('empty collection yields an empty view', () => {
        const { collection } = makeCollection(0);
        assert.deepStrictEqual(toTreeItemCollection(collection, makeReprOptions()), []);
    });

    test('every delimiter is a distinct instance', () => {
        // the tree view rejects the same element object appearing twice among the children
        const { collection } = makeCollection(3);
        const items = toTreeItemCollection(collection, makeReprOptions({ enableDelimiter: true }));

        const delimiters = items.filter(item => item instanceof Delimiter);
        assert.strictEqual(delimiters.length, 2);
        assert.strictEqual(new Set(delimiters).size, delimiters.length);
    });

    test('descending order with hideHistory keeps the latest arrivals at the top', () => {
        const { collection, arrivals } = makeCollection(5);
        const items = toTreeItemCollection(collection, makeReprOptions({
            hideHistory: true,
            unpinHideThreshold: 2,
            sortOrder: 'descending',
        }));

        assert.ok(items[0] instanceof SectionDelimiter);
        assert.strictEqual(items[1], arrivals[4]);
        assert.strictEqual(items[2], arrivals[3]);
        assert.ok(items[3] instanceof HistoryPlaceholder);
        assert.strictEqual(items.length, 4);
    });

    test('ascending order with hideHistory keeps the latest arrivals at the bottom', () => {
        const { collection, arrivals } = makeCollection(5);
        const items = toTreeItemCollection(collection, makeReprOptions({
            hideHistory: true,
            unpinHideThreshold: 2,
            sortOrder: 'ascending',
        }));

        assert.ok(items[0] instanceof SectionDelimiter);
        assert.ok(items[1] instanceof HistoryPlaceholder);
        assert.strictEqual(items[2], arrivals[3], 'the latest arrivals must be kept, the oldest hidden');
        assert.strictEqual(items[3], arrivals[4]);
        assert.strictEqual(items.length, 4);
    });

    test('hideHistory with fewer arrivals than the threshold shows everything', () => {
        const { collection } = makeCollection(3);
        const items = toTreeItemCollection(collection, makeReprOptions({
            hideHistory: true,
            unpinHideThreshold: 20,
        }));

        assert.strictEqual(items.filter(item => item instanceof HistoryPlaceholder).length, 0);
        assert.strictEqual(items.filter(item => item instanceof Arrival).length, 3);
    });

    test('pinned arrivals are listed before the section delimiter', () => {
        const { collection, arrivals } = makeCollection(3);
        arrivals[1].isPinned = true;

        const items = toTreeItemCollection(collection, makeReprOptions());

        assert.strictEqual(items[0], arrivals[1]);
        assert.ok(items[1] instanceof SectionDelimiter);
        assert.strictEqual(items.filter(item => item instanceof Arrival).length, 3);
    });

    test('sorting by encore ranks hotter trees first in descending order', () => {
        const { collection, arrivals } = makeCollection(3);
        arrivals[0].encore();
        arrivals[0].encore();
        arrivals[2].encore();

        const items = toTreeItemCollection(collection, makeReprOptions({ sortField: 'encore' }));
        const shownArrivals = items.filter(item => item instanceof Arrival);

        assert.deepStrictEqual(shownArrivals, [arrivals[0], arrivals[2], arrivals[1]]);
    });
});
