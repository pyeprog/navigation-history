import {
    ArrivalReprOptions,
    HistoryPlaceholder,
    SectionDelimiter,
    SectionDelimiterReprOptions,
    SortField,
    SortOrder,
    Arrival,
    Delimiter,
    TreeItemInterface
} from "./arrival";
import { ArrivalCollection } from "./arrivalCollection";

export type delimiterReprOptions = {
    delimiterString: string,
    enableDelimiter: boolean,
};

export type TreeViewReprOptions = delimiterReprOptions & SectionDelimiterReprOptions & ArrivalReprOptions;

export function toTreeItemCollection(arrivalCollection: ArrivalCollection, reprOptions: TreeViewReprOptions): TreeItemInterface[] {
    function addDelimiter(arrivals: TreeItemInterface[], delimiterString: string): TreeItemInterface[] {
        const result: TreeItemInterface[] = [];
        for (const arrival of arrivals) {
            result.push(arrival);
            // each delimiter must be a distinct instance: the tree view rejects
            // the same element appearing twice among the children
            result.push(new Delimiter(delimiterString));
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

    if (arrivalCollection.isEmpty) {
        return [];
    }

    arrivalCollection.setReprOptions(reprOptions);
    const pinnedArrivals = sortArrivals(arrivalCollection.pinnedArrivals(), reprOptions.sortOrder, reprOptions.sortField);
    const unpinnedArrivals = sortArrivals(arrivalCollection.unpinnedArrivals(), reprOptions.sortOrder, reprOptions.sortField);
    const hideThreshold = Math.max(0, reprOptions.unpinHideThreshold);
    // hiding always keeps the "most relevant" end: with ascending order that end is
    // the tail of the list, with descending order it is the head
    const shortenUnpinnedArrivals = reprOptions.sortOrder === 'ascending'
        ? (hideThreshold > 0 ? unpinnedArrivals.slice(-hideThreshold) : [])
        : unpinnedArrivals.slice(0, hideThreshold);
    let hiddenUnpinnedArrivals: TreeItemInterface[];
    if (unpinnedArrivals.length > hideThreshold && reprOptions.hideHistory) {
        if (reprOptions.sortOrder === 'ascending') {
            hiddenUnpinnedArrivals = [new HistoryPlaceholder(), ...shortenUnpinnedArrivals];
        } else {
            hiddenUnpinnedArrivals = [...shortenUnpinnedArrivals, new HistoryPlaceholder()];
        }
    } else {
        hiddenUnpinnedArrivals = unpinnedArrivals;
    }

    const sectionDelimiter = new SectionDelimiter(pinnedArrivals.length, unpinnedArrivals.length, reprOptions);

    const pinned = reprOptions.enableDelimiter ? addDelimiter(pinnedArrivals, reprOptions.delimiterString) : pinnedArrivals;
    const unpinned = reprOptions.enableDelimiter ? addDelimiter(hiddenUnpinnedArrivals, reprOptions.delimiterString) : hiddenUnpinnedArrivals;

    return [...pinned, sectionDelimiter, ...unpinned];

}