import * as vscode from 'vscode';
import { Arrival, ArrivalReprOptions } from "./arrival";

export class ArrivalCollection {
    private _arrivalList: Array<Arrival> = new Array();

    setReprOptions(representationOptions: ArrivalReprOptions): ArrivalCollection {
        this.allArrivals().forEach(arrival => {
            arrival.representationOptions = representationOptions;
        });
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

    allArrivals(): Arrival[] {
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

    pinnedArrivals(): Arrival[] {
        return this._arrivalList.filter(arrival => arrival.isPinned);
    }

    unpinnedArrivals(): Arrival[] {
        return this._arrivalList.filter(arrival => !arrival.isPinned);
    }
}
