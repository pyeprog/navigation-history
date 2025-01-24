import * as vscode from 'vscode';
import { Arrival } from "./arrival";

export type SortStrategy = 'latestFirst' | 'oldestFirst' | 'hottestFirst';
export type SortOrder = 'ascending' | 'descending';
export type SortField = 'time' | 'encore';

export class ArrivalCollection {
    private _arrivalList: Array<Arrival> = new Array();
    private _sortOrder: SortOrder = 'descending';
    private _sortField: SortField = 'time';
    private _delimiterString: string = '';
    public isFolded: boolean = true;
    public unpinFoldThreshold: number = 20;

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

        const originUnpinnedArrivals = sortArrivals(this._arrivalList, this._sortOrder, this._sortField).filter(arrival => !arrival.isPinned);
        const shortenUnpinnedArrivals = this.isFolded ? originUnpinnedArrivals.slice(0, this.unpinFoldThreshold) : originUnpinnedArrivals;
        let unpinnedArrivals: Arrival[];
        if (originUnpinnedArrivals.length > this.unpinFoldThreshold && this.isFolded) {
            if (this._sortOrder === 'ascending') {
                unpinnedArrivals = [Arrival.createFoldPlaceholder(), ...shortenUnpinnedArrivals];
            } else {
                unpinnedArrivals = [...shortenUnpinnedArrivals, Arrival.createFoldPlaceholder()];
            }
        } else {
            unpinnedArrivals = originUnpinnedArrivals;
        }

        const pinnedArrivals = sortArrivals(this._arrivalList, this._sortOrder, this._sortField).filter(arrival => arrival.isPinned);
        const orderIcon = this._sortOrder === 'ascending' ? '↑' : '↓';
        const foldStatus = this.isFolded ? `${this.unpinFoldThreshold}` : '◼︎';
        const delimiterInfo: string[] = [
            ...(pinnedArrivals.length > 0 ? [`↑ ${pinnedArrivals.length} pinned`] : []),
            `↓ ${unpinnedArrivals.length} unpinned`,
            `sorted by (${this._sortField})`,
            `order (${orderIcon})`,
            `fold (${foldStatus})`,
        ];
        const sectionDelimiters = Arrival.createDelimiter(delimiterInfo.join(' | '), true);

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

    delete(arrival: Arrival) {
        const found = this.getByTracingUri(arrival.symbol.tracingUri);
        if (!found) {
            return;
        }
        this._arrivalList = this._arrivalList.filter(a => a.symbol.tracingUri.toString() !== arrival.symbol.tracingUri.toString());
        arrival.parent?.removeChild(arrival);
    }

    deleteOtherTrees(arrival: Arrival) {
        const remainingArrival = arrival.root;
        this._arrivalList = this._arrivalList.filter(a => a.symbol.tracingUri.toString() === remainingArrival.symbol.tracingUri.toString());
    }

    getByTracingUri(tracingUri: vscode.Uri, defaultValue: Arrival | null = null): Arrival | null {
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
        const arrival = this.getByTracingUri(tracingUri);
        if (arrival) {
            arrival.isPinned = pinState;
            return true;
        }

        return false;
    }
    
    forEach(callback: (arrival: Arrival) => void) {
        this._arrivalList.forEach(callback);
    }
}
