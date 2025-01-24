import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { parseArrivalFromEditorState } from './util';
import { Arrival } from './arrival';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';
import { ArrivalCollection, SortField, SortOrder } from './arrivalCollection';


export function registerUpdatingHandler(
    treeView: vscode.TreeView<Arrival | null | undefined>,
    arrivalHistoryProvider: ArrivalHistoryProvider,
    recorder: ArrivalRecorder,
    decorationProvider: ArrivalDecorationProvider,
    statusBarItem: ArrivalStatusBarItem,
) {

    return vscode.window.onDidChangeTextEditorSelection(async (event) => {
        if (!event) {
            return;
        }

        const arrival = await parseArrivalFromEditorState(event.textEditor);
        if (!arrival) {
            return;
        }

        const savedArrival = recorder.record(arrival);

        arrivalHistoryProvider.refresh();
        decorationProvider.refresh();
        statusBarItem.refresh();

        treeView.reveal(savedArrival, { select: true, focus: false, expand: 3 });
    });
}


export function registerConfigChangeHandler(
    arrivalCollection: ArrivalCollection,
    arrivalHistoryProvider: ArrivalHistoryProvider,
    arrivalStatusBarItem: ArrivalStatusBarItem,
) {
    return vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('navigationHistory.showStatusBar')) {
            const showStatusBar = vscode.workspace.getConfiguration('navigationHistory').get('showStatusBar');
            if (showStatusBar) {
                arrivalStatusBarItem.enable();
            } else {
                arrivalStatusBarItem.disable();
            }

        } else if (event.affectsConfiguration('navigationHistory.showFilenameInItemDescription')) {
            const showFilenameInItemDescription = vscode.workspace.getConfiguration('navigationHistory').get('showFilenameInItemDescription');
            arrivalHistoryProvider.setShowFilename(showFilenameInItemDescription as boolean);

        } else if (event.affectsConfiguration('navigationHistory.showPositionInItemDescription')) {
            const showPositionInItemDescription = vscode.workspace.getConfiguration('navigationHistory').get('showPositionInItemDescription');
            arrivalHistoryProvider.setShowPosition(showPositionInItemDescription as boolean);

        } else if (event.affectsConfiguration('navigationHistory.defaultSortField')) {
            const sortField = vscode.workspace.getConfiguration('navigationHistory').get('defaultSortField');
            arrivalCollection.setSortField(sortField as SortField);
            arrivalHistoryProvider.refresh();

        } else if (event.affectsConfiguration('navigationHistory.defaultSortOrder')) {
            const sortOrder = vscode.workspace.getConfiguration('navigationHistory').get('defaultSortOrder');
            arrivalCollection.setSortOrder(sortOrder as SortOrder);
            arrivalHistoryProvider.refresh();

        } else if (event.affectsConfiguration('navigationHistory.delimiterString')) {
            const delimiterString = vscode.workspace.getConfiguration('navigationHistory').get('delimiterString');
            arrivalCollection.setDelimiterString(delimiterString as string);
            arrivalHistoryProvider.refresh();

        } else if (event.affectsConfiguration('navigationHistory.defaultFolding')) {
            const defaultFolding = vscode.workspace.getConfiguration('navigationHistory').get('defaultFolding');
            arrivalCollection.isFolded = defaultFolding as boolean;
            arrivalHistoryProvider.refresh();

        } else if (event.affectsConfiguration('navigationHistory.unpinnedItemFoldingThreshold')) {
            const unpinFoldThreshold = vscode.workspace.getConfiguration('navigationHistory').get('unpinnedItemFoldingThreshold');
            arrivalCollection.unpinFoldThreshold = unpinFoldThreshold as number;
            arrivalHistoryProvider.refresh();
        }
    });
}
