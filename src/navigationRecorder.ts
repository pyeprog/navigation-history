import { debugLog } from './debug';
import { NavigationItem, NavigationIterface } from './navigationItem';

// This recorder is responsible for recording the navigation history
export class NavigationRecorder {
    private navigationHistory: NavigationItem[] = [];

    constructor() {
    }

    get list(): NavigationItem[] {
        return this.navigationHistory;
    }

    record(item: NavigationIterface) {
        // when history is empty
        if (this.navigationHistory.length === 0) {
            debugLog("ADD AN ITEM", true);
            this.navigationHistory.push(NavigationItem.createFrom(item));
            return;
        }

        // when move around in range of same symbol and don't touch any sub-symbol
        if (this.navigationHistory.at(-1)?.isEqual(item)) {
            debugLog("NOTHING SHOWS", true);
            return;
        }
        
        // when move around in range of same symbol and touch sub-symbol
        if (this.navigationHistory.at(-1)) {
            // TODO
        }

        // if (this.navigationHistory.length > 0
        //     && this.navigationHistory.at(-1)?.symbol.name !== item.symbol.name
        //     && this.navigationHistory.at(-1)?.word === item.symbol.name) {
        //     console.log('DRILL IN');
        // } else {
        //     console.log('MOVE AROUND');
        // }

        // this.navigationHistory.push(NavigationItem.createFrom(item));
    }
}
