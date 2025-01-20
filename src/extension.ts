import * as vscode from 'vscode';
import { NavigationHistoryProvider } from './navigationHistoryProvider';

export function activate(context: vscode.ExtensionContext) {
	const navigationHistoryProvider = new NavigationHistoryProvider(context);
	const treeView = vscode.window.createTreeView('navigationHistory', {
		treeDataProvider: navigationHistoryProvider
	});
	context.subscriptions.push(treeView);

	context.subscriptions.push(vscode.commands.registerCommand(
		'navigationHistory.cleanup',
		() => navigationHistoryProvider.cleanup()
	));
}

export function deactivate() { }
