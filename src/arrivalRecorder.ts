import * as vscode from 'vscode';
import { debugLog } from './debug';
import { Arrival } from './arrival';
import { TracableSymbol } from './tracableSymbol';
import { ArrivalCollection } from './arrivalCollection';


function doesArrivalHasSameSymbol(symbol: TracableSymbol, arrival: Arrival) {
    return arrival.symbol.isEqual(symbol);
}

function isSymbolTheSameAsArrivalWhenEditing(symbol: TracableSymbol, arrival: Arrival) {
    return arrival.symbol.hasSameStartPosition(symbol);
}

// In some programming languages (such as C), the symbol.name field in Arrival contains a parameter list, while the word field does not, so the content inside the parentheses needs to be removed before matching.
function removeParenthesesContent(str: string): string {
    return str.replace(/\([^)]*\)/g, '');
}


// This recorder is responsible for recording the navigation history
export class ArrivalRecorder {
    private latestArrival: Arrival | undefined = undefined;
    private arrivalCollection: ArrivalCollection;

    constructor(arrivalCollection: ArrivalCollection) {
        this.arrivalCollection = arrivalCollection;
    }

    clear() {
        this.arrivalCollection.clear();
        this.latestArrival = undefined;
    }

    /**
     * Record the arrival, and return the saved arrival in the arrival collection, which in most cases is the same as the arrival passed in.
     * But if this arrival is already in the tree, then the returned arrival is the old arrival that has the same symbol.
     * @param arrival the arrival to record
     * @returns the arrival saved in the arrival collection
     */
    record(arrival: Arrival): Arrival {
        let recordedArrival: Arrival | null = null;

        // iterate through arrival collection from latest to oldest
        for (let i = this.arrivalCollection.length - 1; i >= 0 && !recordedArrival; --i) {
            recordedArrival = this.tryRecordInTree(arrival, this.arrivalCollection.at(i));
        }

        // when move around outside the scope of any recorded tree, this is the default behavior
        if (!recordedArrival) {
            debugLog("ADD A NEW ITEM TREE", false);
            this.arrivalCollection.push(this.createNewArrivalTreeFromLeaf(arrival));
            recordedArrival = arrival;
        }

        this.latestArrival = arrival;
        return recordedArrival;
    }

    /**
     * Try to record the arrival into the given tree.
     * @returns the arrival saved in the tree, or null if this tree is not the right place for it
     */
    private tryRecordInTree(arrival: Arrival, rootArrivalForSearching: Arrival): Arrival | null {
        // when move around in range of same symbol I've already arrived
        const arrivalInTree = this.findInArrivalTree(arrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
        if (arrivalInTree) {
            debugLog("NOTHING SHOWS", false);
            // if there's already in the tree an arrival that has the same symbol, then we don't add this arrival to the tree.
            // but the recorded arrival(returned value) should be the old arrival, not the current arrival.
            arrivalInTree.encore();
            return arrivalInTree;
        }

        const latestArrival = this.latestArrival;
        const isDrillInFromLatestArrival = !!latestArrival
            && !latestArrival.isOnSameSymbolOf(arrival)
            && latestArrival.word === removeParenthesesContent(arrival.symbol.name);

        if (latestArrival && isDrillInFromLatestArrival) {
            // when drill into(jump to) another function or (independent) variable from function
            if (this.isSymbolBeenOneOf(arrival.symbol.kind, [vscode.SymbolKind.Function, vscode.SymbolKind.Variable, vscode.SymbolKind.Constant])
                && !arrival.symbol.parent) {

                const latestArrivalInTree = this.findInArrivalTree(latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                if (latestArrivalInTree) {
                    debugLog("ADD A CHILD FOR DRILLING IN", false);
                    latestArrivalInTree.word = latestArrival.word;
                    latestArrivalInTree.addChild(arrival);
                    return arrival;
                }
            }

            // when drill into another method of same class
            if (arrival.symbol.kind === vscode.SymbolKind.Method
                && arrival.symbol.parent?.isEqual(latestArrival.symbol.parent)) {

                const latestArrivalInTree = this.findInArrivalTree(latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                if (latestArrivalInTree) {
                    debugLog("ADD A CHILD FOR DRILLING INTO ANOTHER METHOD OF SAME CLASS", false);
                    latestArrivalInTree.word = latestArrival.word;
                    latestArrivalInTree.addChild(arrival);
                    return arrival;
                }
            }

            // when drill into a class
            if (arrival.symbol.kind === vscode.SymbolKind.Class) {
                const latestArrivalInTree = this.findInArrivalTree(latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                if (latestArrivalInTree) {
                    debugLog("ADD A CHILD FOR CLASS", false);
                    latestArrivalInTree.word = latestArrival.word;
                    latestArrivalInTree.addChild(arrival);
                    return arrival;
                }
            }

            // when drill into(jump to) another class method or class variable from function
            if (!arrival.symbol.parent?.isEqual(latestArrival.symbol)
                && !arrival.symbol.parent?.isEqual(latestArrival.symbol.parent)
                && this.isSymbolBeenOneOf(arrival.symbol.parent?.kind, [vscode.SymbolKind.Class, vscode.SymbolKind.Object])) {

                const latestArrivalInTree = this.findInArrivalTree(latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                if (latestArrivalInTree) {
                    debugLog("ADD A CHILD FOR CLASS AND GRANDCHILD FOR SYMBOL", false);
                    latestArrivalInTree.word = latestArrival.word;
                    const classSymbolArrivalInTree = this.findInArrivalTree(arrival.symbol.parent, rootArrivalForSearching, doesArrivalHasSameSymbol);
                    if (classSymbolArrivalInTree) {
                        // class symbol is already in the tree
                        classSymbolArrivalInTree.addChild(arrival);
                    } else {
                        // add class symbol as a child of the latest arrival, bind current arrival as the child of class symbol
                        const parentSymbol = arrival.symbol.parent as TracableSymbol;
                        const classSymbolArrival = new Arrival(parentSymbol, parentSymbol.name);
                        classSymbolArrival.addChild(arrival);
                        latestArrivalInTree.addChild(classSymbolArrival);
                    }
                    return arrival;
                }
            }
        }

        // special case: when we edit the symbol
        // the symbol under cursor will be slightly different from the symbol in the tree, but their start position should be the same.
        // so we need to find the old symbol by this feature, and then replace the old symbol with the new version.
        // and we shouldn't increase encore count, because we are just editing inline, not moving around.
        const arrivalInTreeBeforeEditing = this.findInArrivalTree(arrival.symbol, rootArrivalForSearching, isSymbolTheSameAsArrivalWhenEditing);
        if (arrivalInTreeBeforeEditing) {
            arrivalInTreeBeforeEditing.symbol = arrival.symbol;
            return arrivalInTreeBeforeEditing;
        }

        // when move around, but symbol that contains arrival's symbol(including itself) has been already in the tree, thus append the arrival as a child of the old symbol
        const ancestorArrivalInTree = this.findSymbolAncestorInArrivalTree(arrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
        if (ancestorArrivalInTree) {
            debugLog("ADD A CHILD TO ANCESTOR FOR LANDING ON ITS SUB-SYMBOL", false);
            const newArrivalTreeRoot: Arrival = this.createNewArrivalTreeFromLeaf(arrival, ancestorArrivalInTree.symbol);
            ancestorArrivalInTree.addChild(newArrivalTreeRoot);
            return arrival;
        }

        return null;
    }

    /**
     * Create a new arrival tree from a leaf
     * @param leaf the leaf arrival
     * @param stopAt the symbol once reached to stop the creation of the arrival tree
     * @returns the root of the new arrival tree (NOT including the stopAt symbol if given)
     */
    private createNewArrivalTreeFromLeaf(leaf: Arrival, stopAt: TracableSymbol | null = null): Arrival {
        if (!leaf.symbol.parent || (stopAt && leaf.symbol.parent.isEqual(stopAt))) {
            return leaf;
        }

        const parentArrival = new Arrival(leaf.symbol.parent, leaf.symbol.parent.name);
        parentArrival.addChild(leaf);
        return this.createNewArrivalTreeFromLeaf(parentArrival, stopAt);
    }

    /**
     * Find in the arrival tree the arrival that contains any ancestor symbol of the target symbol(including the target symbol itself)
     * @param leafTargetSymbol the target symbol
     * @param root the root of the arrival tree
     * @param predicator the predicator to find the ancestor
     * @returns the arrival found in the arrival tree or undefined if not found
     */
    private findSymbolAncestorInArrivalTree(
        leafTargetSymbol: TracableSymbol | null | undefined,
        root: Arrival,
        predicator: (symbol: TracableSymbol, arrival: Arrival) => boolean): Arrival | undefined {

        if (!leafTargetSymbol) {
            return undefined;
        }

        let currentTargetSymbol: TracableSymbol | null | undefined = leafTargetSymbol;
        while (currentTargetSymbol) {
            const arrival = this.findInArrivalTree(currentTargetSymbol, root, predicator);
            if (arrival) {
                return arrival;
            }
            currentTargetSymbol = currentTargetSymbol.parent;
        }

        return undefined;
    }

    /**
     * Find the arrival in the tree by symbol
     * @param targetSymbol symbol that we want to find in the tree
     * @param root root arrival of the tree
     * @returns the arrival found in the tree or undefined if not found
     */
    private findInArrivalTree(
        targetSymbol: TracableSymbol | null | undefined,
        root: Arrival,
        predicator: (symbol: TracableSymbol, arrival: Arrival) => boolean): Arrival | undefined {
        if (!targetSymbol) {
            return undefined;
        }

        if (predicator(targetSymbol, root)) {
            return root;
        }

        // find child in reverse order to find the latest child first
        for (let i = root.children.length - 1; i >= 0; --i) {
            const child: Arrival | undefined = this.findInArrivalTree(targetSymbol, root.children[i], predicator);
            if (child) {
                return child;
            }
        }

        return undefined;
    }

    /**
     * Check if the symbol is one of the given symbols
     * @param symbol the symbol to check, can be null or undefined
     * @param symbols the symbols to check against
     * @returns true if the symbol is one of the given symbols, false otherwise
     */
    private isSymbolBeenOneOf(symbol: vscode.SymbolKind | null | undefined, symbols: vscode.SymbolKind[]) {
        // don't use falsiness here: SymbolKind.File is 0
        if (symbol === null || symbol === undefined) {
            return false;
        }

        return symbols.includes(symbol);
    }

}
