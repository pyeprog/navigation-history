import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { ArrivalCollection } from './arrivalCollection';
import { registerConfigChangeHandler, registerUpdatingHandler } from './eventHandlerRegister';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { Arrival, SortField, SortOrder } from './arrival';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('navigationHistory');
	const reprOptions = {
		delimiterString: config.get('delimiter.delimiterString') as string,
		enableDelimiter: config.get('delimiter.enableDelimiter') as boolean,
		sortField: config.get('sorting.defaultSortField') as SortField,
		sortOrder: config.get('sorting.defaultSortOrder') as SortOrder,
		unpinFoldThreshold: config.get('folding.unpinnedItemFoldingThreshold') as number,
		isFolded: config.get('folding.defaultFolding') as boolean,
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

	const colorOptions = {
		colorize: config.get('color.enableColorizing') as boolean,
		warmColorThreshold: config.get('color.warmColorThreshold') as number,
		hotColorThreshold: config.get('color.hotColorThreshold') as number,
	};
	const arrivalDecorationProvider = new ArrivalDecorationProvider(arrivalCollection, colorOptions);
	context.subscriptions.push(vscode.window.registerFileDecorationProvider(arrivalDecorationProvider));

	const arrivalStatusBarItem = new ArrivalStatusBarItem(arrivalCollection);
	arrivalStatusBarItem.dispose(context);

	const updatingHandler = registerUpdatingHandler(treeView, arrivalHistoryProvider, arrivalRecorder, arrivalDecorationProvider, arrivalStatusBarItem);
	context.subscriptions.push(updatingHandler);

	const configChangeHandler = registerConfigChangeHandler(arrivalHistoryProvider, arrivalDecorationProvider, arrivalStatusBarItem);
	context.subscriptions.push(configChangeHandler);
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

	const deleteCommand = vscode.commands.registerCommand(
		'navigationHistory.delete',
		(arrival: Arrival) => {
			arrivalCollection.delete(arrival);
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(deleteCommand);

	const deleteOtherTreesCommand = vscode.commands.registerCommand(
		'navigationHistory.deleteOtherTrees',
		(arrival: Arrival) => {
			arrivalCollection.deleteOtherTrees(arrival);
			arrivalHistoryProvider.refresh();
		}
	);
	context.subscriptions.push(deleteOtherTreesCommand);

	const unpinCommand = vscode.commands.registerCommand(
		'navigationHistory.unpin',
		(arrival: Arrival) => {
			arrivalCollection.setArrivalPinState(arrival.symbol.tracingUri, false);
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

	const unfoldCommand = vscode.commands.registerCommand(
		'navigationHistory.unfold',
		() => {
			arrivalHistoryProvider.updateReprOptions({
				isFolded: false,
			});
		}
	);
	context.subscriptions.push(unfoldCommand);

	const foldCommand = vscode.commands.registerCommand(
		'navigationHistory.fold',
		() => {
			arrivalHistoryProvider.updateReprOptions({
				isFolded: true,
			});
		}
	);
	context.subscriptions.push(foldCommand);
}

export function deactivate() { }
