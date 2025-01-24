import * as vscode from 'vscode';
import { Arrival } from "./arrival";

export type SortStrategy = 'latestFirst' | 'oldestFirst' | 'hottestFirst';
export type SortOrder = 'ascending' | 'descending';
export type SortField = 'time' | 'encore';

export class ArrivalCollection {
    private _arrivalList: Array<Arrival> = new Array();
    private _sortOrder: SortOrder = 'ascending';
    private _sortField: SortField = 'time';
    private _delimiterString: string = ' ';

    asList(): Arrival[] {
        function addDelimiter(arrivals: Arrival[], delimiterString: string) {
            if (delimiterString.length === 0) {
                return arrivals;
            }

            const delimiter = Arrival.createDelimiter(delimiterString);
            const result: Arrival[] = [];
            for (const arrival of arrivals) {
                result.push(arrival);
                result.push(delimiter);
            }
            // pop the delimiter at the end
            result.pop();
            return result;
        }

        function sortArrivals(arrivals: Arrival[], sortOrder: SortOrder, sortBy: SortField): Arrival[] {
            function compare(value1: number, value2: number): number {
                return sortOrder === 'ascending' ? value1 - value2 : value2 - value1;
            }

            type ArrivalWithIndex = [Arrival, number];
            function valueOf(arrivalWithIndex: ArrivalWithIndex): number {
                const [arrival, index] = arrivalWithIndex;
                return sortBy === 'time' ? index : arrival.treeEncoreCount;
            }

            const arrivalWithIndex: ArrivalWithIndex[] = arrivals.map((arrival, index) => ([arrival, index]));

            arrivalWithIndex.sort((tuple1, tuple2) => compare(valueOf(tuple1), valueOf(tuple2)));

            return arrivalWithIndex.map(([arrival, _]) => arrival);
        }

        const pinnedArrivals = sortArrivals(this._arrivalList, this._sortOrder, this._sortField).filter(arrival => arrival.isPinned);
        const unpinnedArrivals = sortArrivals(this._arrivalList, this._sortOrder, this._sortField).filter(arrival => !arrival.isPinned);
        const orderIcon = this._sortOrder === 'ascending' ? '↑' : '↓';
        const delimiterInfo: string[] = [
            ...(pinnedArrivals.length > 0 ? [`↑ ${pinnedArrivals.length} pinned`] : []),
            `sorted by (${this._sortField})`,
            `order (${orderIcon})`,
        ];
        const sectionDelimiters = Arrival.createDelimiter(delimiterInfo.join(' | '));
        const result = [
            ...addDelimiter(pinnedArrivals, this._delimiterString),
            sectionDelimiters,
            ...addDelimiter(unpinnedArrivals, this._delimiterString)
        ];

        return result;
    }

    switchSortOrder(): ArrivalCollection {
        this._sortOrder = this._sortOrder === 'ascending' ? 'descending' : 'ascending';
        return this;
    }

    switchSortField(): ArrivalCollection {
        this._sortField = this._sortField === 'time' ? 'encore' : 'time';
        return this;
    }

    setDelimiterString(delimiterString: string): ArrivalCollection {
        this._delimiterString = delimiterString;
        return this;
    }

    get length(): number {
        return this._arrivalList.length;
    }

    get isEmpty(): boolean {
        return this._arrivalList.length === 0;
    }

    at(index: number): Arrival {
        if (index < 0) {
            index = this._arrivalList.length + index;
        }

        if (index >= this._arrivalList.length) {
            throw new Error("Index out of bounds");
        }

        return this._arrivalList[index];
    }

    push(arrival: Arrival) {
        this._arrivalList.push(arrival);
    }

    clear() {
        this._arrivalList = [];
    }

    get(tracingUri: vscode.Uri, defaultValue: Arrival | null = null): Arrival | null {
        const tracingUriString = tracingUri.toString();

        function findArrivalInTree(root: Arrival, tracingUriString: string): Arrival | null {
            if (root.symbol.tracingUri.toString() === tracingUriString) {
                return root;
            }

            for (let i = root.children.length - 1; i >= 0; --i) {
                const child = root.children[i];
                const result = findArrivalInTree(child, tracingUriString);
                if (result) {
                    return result;
                }
            }

            return null;
        }

        for (let i = this._arrivalList.length - 1; i >= 0; --i) {
            const arrival = this._arrivalList[i];
            const result = findArrivalInTree(arrival, tracingUriString);
            if (result) {
                return result;
            }
        }

        return defaultValue;
    }

    all(): Arrival[] {
        const result: Arrival[] = [];

        function addArrivalRecursively(arrival: Arrival) {
            result.push(arrival);
            arrival.children.forEach(child => addArrivalRecursively(child));
        }

        this._arrivalList.forEach(arrival => addArrivalRecursively(arrival));

        return result;
    }

    setArrivalPinState(tracingUri: vscode.Uri, pinState: boolean): boolean {
        const arrival = this.get(tracingUri);
        if (arrival) {
            arrival.isPinned = pinState;
            return true;
        }

        return false;
    }
}
