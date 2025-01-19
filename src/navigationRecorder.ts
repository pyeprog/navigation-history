import { debugLog } from './debug';
import { Arrival, NavigationIterface } from './arrival';
import { TracableSymbol } from './tracableSymbol';

// This recorder is responsible for recording the navigation history
export class NavigationRecorder {
    private navigationHistory: Arrival[] = [];
    private latestArrival: Arrival | undefined = undefined;

    get list(): Arrival[] {
        return this.navigationHistory;
    }

    record(arrival: Arrival) {
        const exitCodeBlock = () => {
            throw new Error("exit the code block");
        };

        try {
            // when history is empty
            if (this.navigationHistory.length === 0) {
                debugLog("ADD AN ITEM", true);
                this.navigationHistory.push(arrival);
                this.latestArrival = arrival;
                exitCodeBlock();
            }

            const latestRootArrival = this.navigationHistory[this.navigationHistory.length - 1];

            function arrivalHasSymbol(symbol: TracableSymbol, arrival: Arrival) {
                return arrival.symbol.isEqual(symbol);
            }
            // when move around in range of same symbol I've already arrived
            if (this.findInArrivalTree(arrival.symbol, latestRootArrival, arrivalHasSymbol)) {
                debugLog("NOTHING SHOWS", true);
                exitCodeBlock();
            }

            // when move around in range of same symbol I've alread arrived but touch the sub-symbol in its scope
            const parentArrival = this.findInArrivalTree(arrival.symbol.parent, latestRootArrival, arrivalHasSymbol);
            if (parentArrival) {
                debugLog("ADD A CHILD", true);
                parentArrival.children.push(arrival);
                exitCodeBlock();
            }

            // when drill into another symbol(go to definition) from function
            if (!this.latestArrival?.isOnSameSymbolOf(arrival) && this.latestArrival?.word === arrival.symbol.name) {
                debugLog("ADD A CHILD FOR DRILLING IN", true);
                const latestArrivalInTree = this.findInArrivalTree(this.latestArrival.symbol, latestRootArrival, arrivalHasSymbol);
                if (latestArrivalInTree) {
                    latestArrivalInTree.word = this.latestArrival.word;
                    latestArrivalInTree.children.push(arrival);
                }
                exitCodeBlock();
            }

            debugLog("ADD A NEW ITEM", true);
            this.navigationHistory.push(arrival);

        } catch (error) {
            // only for exit the above code block
        } finally {
            this.latestArrival = arrival;
        }
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
