import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { ArrivalCollection } from './arrivalCollection';
import { registerUpdatingHandler } from './eventHandlerRegister';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';

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
}

export function deactivate() { }
