import * as vscode from 'vscode';
import { debugLog } from './debug';
import { Arrival } from './arrival';
import { TracableSymbol } from './tracableSymbol';
import { ArrivalCollection } from './arrivalCollection';

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
        const exitCodeBlock = () => {
            throw new Error("exit the code block");
        };

        let recordedArrival: Arrival = arrival;

        try {
            // when history is empty
            if (this.arrivalCollection.isEmpty) {
                debugLog("ADD A NEW ITEM TREE", false);
                this.arrivalCollection.push(this.createNewArrivalTreeFromLeaf(arrival));
                exitCodeBlock();
            }

            function doesArrivalHasSameSymbol(symbol: TracableSymbol, arrival: Arrival) {
                return arrival.symbol.isEqual(symbol);
            }
            
            function isSymbolTheSameAsArrivalWhenEditing(symbol: TracableSymbol, arrival: Arrival) {
                return arrival.symbol.hasSameStartPosition(symbol);
            }

            // iterate through arrival collection from latest to oldest
            for (let i = this.arrivalCollection.length - 1; i >= 0; --i) {
                const rootArrivalForSearching = this.arrivalCollection.at(i);
                
                const arrivalInTreeBeforeEditing: Arrival | undefined = this.findSymbolAncestorInArrivalTree(arrival.symbol, rootArrivalForSearching, isSymbolTheSameAsArrivalWhenEditing);
                
                // special case: when we edit the symbol
                if (arrivalInTreeBeforeEditing) {
                    // when we edit the symbol, the symbol under cursor will be slightly different from the symbol in the tree, but their start position should be the same.
                    // so we need to find the old symbol by this feature, and then replace the old symbol with the new version.
                    // and we shouldn't increase encore count, because we are just editing inline, not moving around.

                    arrivalInTreeBeforeEditing.symbol = arrival.symbol;
                    recordedArrival = arrivalInTreeBeforeEditing;
                    exitCodeBlock();
                }
                
                const arrivalInTree: Arrival | undefined = this.findSymbolAncestorInArrivalTree(arrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);

                // when move around in range of same symbol I've already arrived
                if (arrivalInTree && arrivalInTree.isOnSameSymbolOf(arrival)) {
                    debugLog("NOTHING SHOWS", false);
                    // if there's already in the tree an ancestor arrival that has the same symbol, then we don't add this arrival to the tree.
                    // but the recorded arrival(returned value) should be the ancestor arrival, not the current arrival.
                    // in another word, if we have already seen this symbol of the current arrival, we use the old arrival.
                    recordedArrival = arrivalInTree;
                    arrivalInTree.encore();
                    exitCodeBlock();
                }

                // when move around in range of same symbol I've alread arrived but land on the unmet sub-symbol
                if (arrivalInTree) {
                    debugLog("ADD A CHILD FOR LANDING ON SUB-SYMBOL", false);
                    const newArrivalTreeRoot: Arrival = this.createNewArrivalTreeFromLeaf(arrival, arrivalInTree?.symbol);
                    arrivalInTree.addChild(newArrivalTreeRoot);
                    exitCodeBlock();
                }

                // when drill into(jump to) another function or (independent) variable from function
                if (!this.latestArrival?.isOnSameSymbolOf(arrival)
                    && this.latestArrival?.word === arrival.symbol.name
                    && this.isSymbolBeenOneOf(arrival.symbol.kind, [vscode.SymbolKind.Function, vscode.SymbolKind.Variable, vscode.SymbolKind.Constant])
                    && !arrival.symbol.parent) {

                    debugLog("ADD A CHILD FOR DRILLING IN", false);
                    const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                    if (latestArrivalInTree) {
                        latestArrivalInTree.word = this.latestArrival.word;
                        latestArrivalInTree.addChild(arrival);
                    }
                    exitCodeBlock();
                }

                // when drill into a class
                if (!this.latestArrival?.isOnSameSymbolOf(arrival)
                    && this.latestArrival?.word === arrival.symbol.name
                    && arrival.symbol.kind === vscode.SymbolKind.Class) {

                    const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);
                    if (latestArrivalInTree) {
                        debugLog("ADD A CHILD FOR CLASS", false);
                        latestArrivalInTree.word = arrival.word;
                        latestArrivalInTree.addChild(arrival);
                        exitCodeBlock();
                    }
                }

                // when drill into(jump to) another class method or class variable from function
                if (!this.latestArrival?.isOnSameSymbolOf(arrival)
                    && this.latestArrival?.word === arrival.symbol.name
                    && this.isSymbolBeenOneOf(arrival.symbol.parent?.kind, [vscode.SymbolKind.Class, vscode.SymbolKind.Object])) {

                    // don't combine this block with other ones for simplicity, the logic of this block is different from the other ones,
                    // they will evolve independently, thus a little bit of redundancy is acceptable.
                    const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, rootArrivalForSearching, doesArrivalHasSameSymbol);

                    if (latestArrivalInTree) {
                        debugLog("ADD A CHILD FOR CLASS AND GRANDCHILD FOR SYMBOL", false);
                        latestArrivalInTree.word = arrival.word;
                        const classSymbolArrivalInTree = this.findInArrivalTree(arrival.symbol.parent, rootArrivalForSearching, doesArrivalHasSameSymbol);
                        // class symbol is already the child of the latest arrival
                        if (classSymbolArrivalInTree) {
                            classSymbolArrivalInTree.addChild(arrival);
                            exitCodeBlock();

                            // class symbol is not the child of the latest arrival
                        } else {
                            // add class symbol as a child of the latest arrival, bind current arrival as the child of class symbol
                            const parentSymbol = arrival.symbol.parent as TracableSymbol;
                            const classSymbolArrival = new Arrival(parentSymbol, parentSymbol.name);
                            classSymbolArrival.addChild(arrival);
                            latestArrivalInTree.addChild(classSymbolArrival);
                            exitCodeBlock();
                        }
                    }
                }
            }

            // when move around outside the scope of latest arrival, this is the default behavior
            debugLog("ADD A NEW ITEM TREE", false);
            this.arrivalCollection.push(this.createNewArrivalTreeFromLeaf(arrival));

        } catch (exitCodeBlock) {
            // only for exit the above code block
        } finally {
            this.latestArrival = arrival;
        }

        return recordedArrival;
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
        if (!symbol) {
            return false;
        }

        return symbols.includes(symbol);
    }

}
