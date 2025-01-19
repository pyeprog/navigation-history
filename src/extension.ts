import * as vscode from 'vscode';
import { NavigationHistoryProvider } from './navigationHistoryProvider';

export function activate(context: vscode.ExtensionContext) {
	const navigationHistoryProvider = new NavigationHistoryProvider();

	const treeView = vscode.window.createTreeView('navigationHistory', {
		treeDataProvider: navigationHistoryProvider
	});

	context.subscriptions.push(treeView);
}

export function deactivate() { }
