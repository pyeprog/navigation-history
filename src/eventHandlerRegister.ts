import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { parseArrivalFromEditorState } from './util';
import { Arrival } from './arrival';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';


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
