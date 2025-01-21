import * as vscode from 'vscode';
import { Arrival } from "./arrival";

export class ArrivalCollection {
    private _arrivalList: Array<Arrival> = new Array();

    asList(mode: 'pinnedFirst' | 'default' = 'default'): Arrival[] {
        if (mode === 'pinnedFirst') {
            const pinnedArrivals = this._arrivalList.filter(arrival => arrival.isPinned);
            const unpinnedArrivals = this._arrivalList.filter(arrival => !arrival.isPinned);
            return [...pinnedArrivals, ...unpinnedArrivals];
        }

        // default mode
        return this._arrivalList;
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
