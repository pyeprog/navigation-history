import * as vscode from 'vscode';
import { Arrival, ArrivalReprOptions } from "./arrival";
import { TracableSymbol } from './tracableSymbol';

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

        if (index < 0 || index >= this._arrivalList.length) {
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
        // the same symbol may live in several trees, so identify the arrival by
        // object reference instead of tracingUri to avoid deleting an unrelated tree
        if (arrival.parent) {
            arrival.parent.removeChild(arrival);
            return;
        }
        this._arrivalList = this._arrivalList.filter(a => a !== arrival);
    }

    deleteOtherTrees(arrival: Arrival) {
        const remainingArrival = arrival.root;
        this._arrivalList = this._arrivalList.filter(a => a === remainingArrival);
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

    forEach(callback: (arrival: Arrival) => void) {
        this._arrivalList.forEach(callback);
    }

    pinnedArrivals(): Arrival[] {
        return this._arrivalList.filter(arrival => arrival.isPinned);
    }

    unpinnedArrivals(): Arrival[] {
        return this._arrivalList.filter(arrival => !arrival.isPinned);
    }

    /**
     * Shift the recorded symbol ranges when lines are inserted or removed in a document,
     * so that history items keep pointing at the right location after edits.
     * Character-level shifts within a single line are not tracked here; the recorder's
     * editing branch re-syncs the symbol under the cursor from a fresh parse.
     * @returns true if any recorded symbol was shifted
     */
    applyDocumentChanges(event: vscode.TextDocumentChangeEvent): boolean {
        const lineShiftingChanges = event.contentChanges
            .map(change => ({
                startLine: change.range.start.line,
                endLine: change.range.end.line,
                lineDelta: (change.text.split('\n').length - 1) - (change.range.end.line - change.range.start.line),
            }))
            .filter(change => change.lineDelta !== 0);

        if (lineShiftingChanges.length === 0) {
            return false;
        }

        // symbol objects can be shared between arrivals through parent chains,
        // so collect them into a set to shift each object exactly once
        const symbols = new Set<TracableSymbol>();
        for (const arrival of this.allArrivals()) {
            let symbol: TracableSymbol | null | undefined = arrival.symbol;
            while (symbol && !symbols.has(symbol)) {
                symbols.add(symbol);
                symbol = symbol.parent;
            }
        }

        const changedFsPath = event.document.uri.fsPath;
        let anySymbolShifted = false;

        // contentChanges are ordered from the end of the document to the beginning and all
        // ranges refer to the pre-change document, so applying them one by one is safe
        for (const change of lineShiftingChanges) {
            for (const symbol of symbols) {
                if (symbol.uri.fsPath !== changedFsPath) {
                    continue;
                }
                anySymbolShifted = this.shiftSymbolLines(symbol, change.startLine, change.endLine, change.lineDelta) || anySymbolShifted;
            }
        }

        return anySymbolShifted;
    }

    private shiftSymbolLines(symbol: TracableSymbol, changeStartLine: number, changeEndLine: number, lineDelta: number): boolean {
        function shiftRange(range: vscode.Range, startDelta: number, endDelta: number): vscode.Range {
            return new vscode.Range(
                range.start.line + startDelta, range.start.character,
                range.end.line + endDelta, range.end.character,
            );
        }

        // symbol entirely below the change: shift it as a whole
        if (symbol.range.start.line > changeEndLine) {
            symbol.range = shiftRange(symbol.range, lineDelta, lineDelta);
            symbol.selectionRange = shiftRange(symbol.selectionRange, lineDelta, lineDelta);
            return true;
        }

        // change happened inside the symbol: only its end moves
        if (symbol.range.start.line <= changeStartLine && symbol.range.end.line >= changeEndLine) {
            symbol.range = shiftRange(symbol.range, 0, lineDelta);
            return true;
        }

        return false;
    }
}
