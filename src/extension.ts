import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { ArrivalCollection } from './arrivalCollection';
import { registerConfigChangeHandler, ViewUpdater } from './eventHandlerRegister';
import { ArrivalDecorationProvider, ColorReprOptions } from './arrivalDecorationProvider';
import { Arrival, SortField, SortOrder } from './arrival';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';
import { TreeViewReprOptions } from './treeItemCollection';

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('navigationHistory');
	const reprOptions: TreeViewReprOptions = {
		delimiterString: config.get('delimiter.delimiterString') as string,
		enableDelimiter: config.get('delimiter.enableDelimiter') as boolean,
		sortField: config.get('sorting.defaultSortField') as SortField,
		sortOrder: config.get('sorting.defaultSortOrder') as SortOrder,
		unpinHideThreshold: config.get('history.unpinnedItemHidingThreshold') as number,
		hideHistory: config.get('history.hideHistory') as boolean,
		showFilename: config.get('item.showFilenameInItemDescription') as boolean,
		showPosition: config.get('item.showPositionInItemDescription') as boolean,
	};

	const arrivalCollection = new ArrivalCollection();

	const arrivalRecorder = new ArrivalRecorder(arrivalCollection);
	const arrivalHistoryProvider = new ArrivalHistoryProvider(arrivalCollection, reprOptions);
	const treeView = vscode.window.createTreeView('navigationHistory', {
		treeDataProvider: arrivalHistoryProvider,
	});
	context.subscriptions.push(treeView);

	const colorOptions: ColorReprOptions = {
		colorize: config.get('color.enableColorizing') as boolean,
		warmColorThreshold: config.get('color.warmColorThreshold') as number,
		hotColorThreshold: config.get('color.hotColorThreshold') as number,
		emphasizePauseState: false
	};
	const arrivalDecorationProvider = new ArrivalDecorationProvider(arrivalCollection, colorOptions);
	context.subscriptions.push(vscode.window.registerFileDecorationProvider(arrivalDecorationProvider));

	const arrivalStatusBarItem = new ArrivalStatusBarItem(arrivalCollection);
	arrivalStatusBarItem.registerTo(context);
	if (!(config.get('showStatusBarItem') as boolean)) {
		arrivalStatusBarItem.disable();
	}

	const viewUpdater = new ViewUpdater(treeView, arrivalRecorder, arrivalHistoryProvider, arrivalDecorationProvider, arrivalStatusBarItem);
	context.subscriptions.push(viewUpdater.registerSelf());

	// keep the recorded symbol ranges in sync when lines are inserted or removed
	const documentChangeHandler = vscode.workspace.onDidChangeTextDocument((event) => {
		if (arrivalCollection.applyDocumentChanges(event)) {
			arrivalHistoryProvider.refresh();
			arrivalDecorationProvider.refresh();
		}
	});
	context.subscriptions.push(documentChangeHandler);

	const configChangeHandler = registerConfigChangeHandler(arrivalHistoryProvider, arrivalDecorationProvider, arrivalStatusBarItem);
	context.subscriptions.push(configChangeHandler);

	const refreshAll = () => {
		arrivalHistoryProvider.refresh();
		arrivalDecorationProvider.refresh();
		arrivalStatusBarItem.refresh();
	};

	const cleanupCommand = vscode.commands.registerCommand(
		'navigationHistory.cleanup',
		() => {
			arrivalRecorder.clear();
			refreshAll();
		}
	);
	context.subscriptions.push(cleanupCommand);

	const pinCommand = vscode.commands.registerCommand(
		'navigationHistory.pin',
		(arrival: Arrival) => {
			arrival.isPinned = true;
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(pinCommand);

	const deleteCommand = vscode.commands.registerCommand(
		'navigationHistory.delete',
		(arrival: Arrival) => {
			arrivalCollection.delete(arrival);
			refreshAll();
		}
	);
	context.subscriptions.push(deleteCommand);

	const deleteOtherTreesCommand = vscode.commands.registerCommand(
		'navigationHistory.deleteOtherTrees',
		(arrival: Arrival) => {
			arrivalCollection.deleteOtherTrees(arrival);
			refreshAll();
		}
	);
	context.subscriptions.push(deleteOtherTreesCommand);

	const unpinCommand = vscode.commands.registerCommand(
		'navigationHistory.unpin',
		(arrival: Arrival) => {
			arrival.isPinned = false;
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(unpinCommand);

	const unpinAllCommand = vscode.commands.registerCommand(
		'navigationHistory.unpinAll',
		() => {
			arrivalCollection.forEach(arrival => { arrival.isPinned = false; });
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(unpinAllCommand);

	const switchSortStrategyCommand = vscode.commands.registerCommand(
		'navigationHistory.switchSortOrder',
		() => {
			const currentSortOrder = arrivalHistoryProvider.getReprOptions().sortOrder;
			arrivalHistoryProvider.updateReprOptions({
				sortOrder: currentSortOrder === 'ascending' ? 'descending' : 'ascending',
			});
		}
	);
	context.subscriptions.push(switchSortStrategyCommand);

	const switchSortFieldCommand = vscode.commands.registerCommand(
		'navigationHistory.switchSortField',
		() => {
			const currentSortField = arrivalHistoryProvider.getReprOptions().sortField;
			arrivalHistoryProvider.updateReprOptions({
				sortField: currentSortField === 'time' ? 'encore' : 'time',
			});
		}
	);
	context.subscriptions.push(switchSortFieldCommand);

	const toggleHistoryHidingCommand = vscode.commands.registerCommand(
		'navigationHistory.toggleHistoryHiding',
		() => {
			arrivalHistoryProvider.toggleHistoryHiding();
		}
	);
	context.subscriptions.push(toggleHistoryHidingCommand);

	const showHistoryCommand = vscode.commands.registerCommand(
		'navigationHistory.showHistory',
		() => {
			arrivalHistoryProvider.updateReprOptions({
				hideHistory: false,
			});
		}
	);
	context.subscriptions.push(showHistoryCommand);

	const hideHistoryCommand = vscode.commands.registerCommand(
		'navigationHistory.hideHistory',
		() => {
			arrivalHistoryProvider.updateReprOptions({
				hideHistory: true,
			});
		}
	);
	context.subscriptions.push(hideHistoryCommand);

	const togglePauseCommand = vscode.commands.registerCommand(
		'navigationHistory.togglePauseState',
		() => {
			viewUpdater.togglePauseState();
			arrivalDecorationProvider.updateReprOptions({ emphasizePauseState: viewUpdater.pausedState });
		}
	);
	context.subscriptions.push(togglePauseCommand);
}

export function deactivate() { }
