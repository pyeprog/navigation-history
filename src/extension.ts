import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { ArrivalCollection } from './arrivalCollection';
import { registerUpdatingHandler } from './eventHandlerRegister';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { Arrival } from './arrival';

export function activate(context: vscode.ExtensionContext) {
	const arrivalCollection = new ArrivalCollection();
	const arrivalRecorder = new ArrivalRecorder(arrivalCollection);
	const arrivalHistoryProvider = new ArrivalHistoryProvider(arrivalCollection);
	const treeView = vscode.window.createTreeView('navigationHistory', {
		treeDataProvider: arrivalHistoryProvider,
		showCollapseAll: true,
	});
	context.subscriptions.push(treeView);

	const arrivalDecorationProvider = new ArrivalDecorationProvider(arrivalCollection);
	context.subscriptions.push(vscode.window.registerFileDecorationProvider(arrivalDecorationProvider));

	const updatingHandler = registerUpdatingHandler(treeView, arrivalHistoryProvider, arrivalRecorder, arrivalDecorationProvider);
	context.subscriptions.push(updatingHandler);

	const cleanupCommand = vscode.commands.registerCommand(
		'navigationHistory.cleanup',
		() => arrivalHistoryProvider.cleanup()
	);
	context.subscriptions.push(cleanupCommand);

	const pinCommand = vscode.commands.registerCommand(
		'navigationHistory.pin',
		(arrival: Arrival) => {
			arrivalCollection.setArrivalPinState(arrival.symbol.tracingUri, true);
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(pinCommand);

	const unpinCommand = vscode.commands.registerCommand(
		'navigationHistory.unpin',
		(arrival: Arrival) => {
			arrivalCollection.setArrivalPinState(arrival.symbol.tracingUri, false);
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(unpinCommand);
	
	// TODO: bug, when unpin a pinned arrival, the order of the tree item is not updated
}

export function deactivate() { }
