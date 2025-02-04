import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { parseArrivalFromEditorState } from './util';
import { Arrival, SortField, SortOrder, TreeItemInterface } from './arrival';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';
import { ArrivalCollection } from './arrivalCollection';


export function registerUpdatingHandler(
    treeView: vscode.TreeView<TreeItemInterface | null | undefined>,
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
    arrivalHistoryProvider: ArrivalHistoryProvider,
    arrivalDecorationProvider: ArrivalDecorationProvider,
    arrivalStatusBarItem: ArrivalStatusBarItem,
) {
    return vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('navigationHistory.showStatusBarItem')) {
            const showStatusBar = vscode.workspace.getConfiguration('navigationHistory').get('showStatusBarItem');
            if (showStatusBar) {
                arrivalStatusBarItem.enable();
            } else {
                arrivalStatusBarItem.disable();
            }

        } else if (event.affectsConfiguration('navigationHistory.item.showFilenameInItemDescription')) {
            const showFilenameInItemDescription = vscode.workspace.getConfiguration('navigationHistory.item').get('showFilenameInItemDescription');
            arrivalHistoryProvider.updateReprOptions({
                showFilename: showFilenameInItemDescription as boolean
            });

        } else if (event.affectsConfiguration('navigationHistory.item.showPositionInItemDescription')) {
            const showPositionInItemDescription = vscode.workspace.getConfiguration('navigationHistory.item').get('showPositionInItemDescription');
            arrivalHistoryProvider.updateReprOptions({
                showPosition: showPositionInItemDescription as boolean
            });

        } else if (event.affectsConfiguration('navigationHistory.delimiter.enableDelimiter')) {
            const enableDelimiter = vscode.workspace.getConfiguration('navigationHistory.delimiter').get('enableDelimiter');
            arrivalHistoryProvider.updateReprOptions({
                enableDelimiter: enableDelimiter as boolean
            });

        } else if (event.affectsConfiguration('navigationHistory.delimiter.delimiterString')) {
            const delimiterString = vscode.workspace.getConfiguration('navigationHistory.delimiter').get('delimiterString');
            arrivalHistoryProvider.updateReprOptions({
                delimiterString: delimiterString as string
            });

        } else if (event.affectsConfiguration('navigationHistory.sorting.defaultSortField')) {
            const sortField = vscode.workspace.getConfiguration('navigationHistory.sorting').get('defaultSortField');
            arrivalHistoryProvider.updateReprOptions({
                sortField: sortField as SortField
            });

        } else if (event.affectsConfiguration('navigationHistory.sorting.defaultSortOrder')) {
            const sortOrder = vscode.workspace.getConfiguration('navigationHistory.sorting').get('defaultSortOrder');
            arrivalHistoryProvider.updateReprOptions({
                sortOrder: sortOrder as SortOrder
            });

        } else if (event.affectsConfiguration('navigationHistory.folding.defaultFolding')) {
            const isFolded = vscode.workspace.getConfiguration('navigationHistory.folding').get('defaultFolding');
            arrivalHistoryProvider.updateReprOptions({
                isFolded: isFolded as boolean
            });

        } else if (event.affectsConfiguration('navigationHistory.folding.unpinnedItemFoldingThreshold')) {
            const unpinFoldThreshold = vscode.workspace.getConfiguration('navigationHistory.folding').get('unpinnedItemFoldingThreshold');
            arrivalHistoryProvider.updateReprOptions({
                unpinFoldThreshold: unpinFoldThreshold as number
            });

        } else if (event.affectsConfiguration('navigationHistory.color.enableColorizing')) {
            const colorize = vscode.workspace.getConfiguration('navigationHistory.color').get('enableColorizing');
            arrivalDecorationProvider.updateReprOptions({
                colorize: colorize as boolean
            });
        } else if (event.affectsConfiguration('navigationHistory.color.warmColorThreshold')) {
            const warmColorThreshold = vscode.workspace.getConfiguration('navigationHistory.color').get('warmColorThreshold');
            arrivalDecorationProvider.updateReprOptions({
                warmColorThreshold: warmColorThreshold as number
            });
        } else if (event.affectsConfiguration('navigationHistory.color.hotColorThreshold')) {
            const hotColorThreshold = vscode.workspace.getConfiguration('navigationHistory.color').get('hotColorThreshold');
            arrivalDecorationProvider.updateReprOptions({
                hotColorThreshold: hotColorThreshold as number
            });
        }
    });
}
