import * as vscode from 'vscode';
import { debugLog } from './debug';
import { Arrival } from './arrival';
import { TracableSymbol } from './tracableSymbol';

// This recorder is responsible for recording the navigation history
export class NavigationRecorder {
    private navigationHistory: Arrival[] = [];
    private latestArrival: Arrival | undefined = undefined;

    get list(): Arrival[] {
        return this.navigationHistory;
    }

    clear() {
        this.navigationHistory = [];
        this.latestArrival = undefined;
    }

    record(arrival: Arrival) {
        const exitCodeBlock = () => {
            throw new Error("exit the code block");
        };

        try {
            // when history is empty
            if (this.navigationHistory.length === 0) {
                debugLog("ADD A NEW ITEM TREE", true);
                this.navigationHistory.push(this.createNewArrivalTreeFromLeaf(arrival));
                exitCodeBlock();
            }

            const latestRootArrival = this.navigationHistory[this.navigationHistory.length - 1];

            function doesArrivalHasSameSymbol(symbol: TracableSymbol, arrival: Arrival) {
                return arrival.symbol.isEqual(symbol);
            }

            const ancestorArrivalInTree: Arrival | undefined = this.findSymbolAncestorInArrivalTree(arrival.symbol, latestRootArrival, doesArrivalHasSameSymbol);

            // when move around in range of same symbol I've already arrived
            if (ancestorArrivalInTree && ancestorArrivalInTree.isOnSameSymbolOf(arrival)) {
                debugLog("NOTHING SHOWS", true);
                exitCodeBlock();
            }

            // when move around in range of same symbol I've alread arrived but land on the unmet sub-symbol
            if (ancestorArrivalInTree) {
                debugLog("ADD A CHILD FOR LANDING ON SUB-SYMBOL", true);
                const newArrivalTreeRoot: Arrival = this.createNewArrivalTreeFromLeaf(arrival, ancestorArrivalInTree?.symbol);
                ancestorArrivalInTree.children.push(newArrivalTreeRoot);
                exitCodeBlock();
            }

            // when drill into(jump to) another function or (independent) variable from function
            if (!this.latestArrival?.isOnSameSymbolOf(arrival)
                && this.latestArrival?.word === arrival.symbol.name
                && arrival.symbol.parent?.kind !== vscode.SymbolKind.Class) {

                debugLog("ADD A CHILD FOR DRILLING IN", true);
                const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, latestRootArrival, doesArrivalHasSameSymbol);
                if (latestArrivalInTree) {
                    latestArrivalInTree.word = this.latestArrival.word;
                    latestArrivalInTree.children.push(arrival);
                }
                exitCodeBlock();
            }

            // when drill into(jump to) another class method or class variable from function
            if (!this.latestArrival?.isOnSameSymbolOf(arrival)
                && this.latestArrival?.word === arrival.symbol.name
                && arrival.symbol.parent?.kind === vscode.SymbolKind.Class) {

                // don't combine this block with other ones for simplicity, the logic of this block is different from the other ones,
                // they will evolve independently, thus a little bit of redundancy is acceptable.
                const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, latestRootArrival, doesArrivalHasSameSymbol);

                if (latestArrivalInTree) {
                    latestArrivalInTree.word = arrival.word;
                    debugLog("ADD A CHILD FOR CLASS AND GRANDCHILD FOR SYMBOL", true);
                    const classSymbolArrivalInTree = this.findInArrivalTree(arrival.symbol.parent, latestRootArrival, doesArrivalHasSameSymbol);
                    // class symbol is already the child of the latest arrival
                    if (classSymbolArrivalInTree) {
                        classSymbolArrivalInTree.children.push(arrival);
                        exitCodeBlock();

                        // class symbol is not the child of the latest arrival
                    } else {
                        // add class symbol as a child of the latest arrival, bind current arrival as the child of class symbol
                        const classSymbolArrival = new Arrival(arrival.symbol.parent, arrival.symbol.parent.name, [arrival], latestArrivalInTree);
                        latestArrivalInTree.children.push(classSymbolArrival);
                        exitCodeBlock();
                    }
                }
            }

            // when move around outside the scope of latest arrival, this is the default behavior
            debugLog("ADD A NEW ITEM TREE", true);
            this.navigationHistory.push(this.createNewArrivalTreeFromLeaf(arrival));

        } catch (exitCodeBlock) {
            // only for exit the above code block
        } finally {
            this.latestArrival = arrival;
        }
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

        const parentArrival = new Arrival(leaf.symbol.parent, leaf.symbol.parent.name, [leaf], null);
        leaf.parent = parentArrival;
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
}
