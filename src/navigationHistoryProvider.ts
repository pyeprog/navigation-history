import * as vscode from 'vscode';
import { Arrival } from './arrival';
import { NavigationRecorder } from './navigationRecorder';
import { debugLog } from './debug';
import { extractSymbols } from './symbolUtil';

export class NavigationHistoryProvider implements vscode.TreeDataProvider<Arrival> {
	private _onDidChangeTreeData: vscode.EventEmitter<Arrival | undefined | null | void> = new vscode.EventEmitter<Arrival | undefined | null | void>();
	readonly onDidChangeTreeData?: vscode.Event<void | Arrival | Arrival[] | null | undefined> | undefined = this._onDidChangeTreeData.event;
	private recorder: NavigationRecorder = new NavigationRecorder();
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.registerNavigationRecorder(this.recorder, this.context);
	}

	registerNavigationRecorder(recorder: NavigationRecorder, context: vscode.ExtensionContext) {
		const disposable = vscode.window.onDidChangeTextEditorSelection(async event => {
			if (!event) {
				return;
			}

			// only pick the first selection, if there are multiple selections, we treat first selection as the pivot
			const position = event.selections[0].anchor;

			// when cursor on space or punctuations like '=', wordRange would be undefined
			const wordRange = event.textEditor.document.getWordRangeAtPosition(position);
			if (!wordRange) {
				return;
			}

			// get the word at the position, which might be different from the symbol at the position
			// this is because when cursor is on the word in a function, the symbol is the function, but the word is the inner word of the function
			const word = event.textEditor.document.getText(wordRange);

			// get the symbol at the position
			const symbol = await extractSymbols(event.textEditor.document, position);
			if (!symbol) {
				return;
			}

			debugLog(`On Word: ${word}  On Symbol: ${symbol.name}`, false);

			const arrival = Arrival.createFrom({
				symbol: symbol,
				word: word,
			});

			recorder.record(arrival);

			this._onDidChangeTreeData.fire();
		});

		context.subscriptions.push(disposable);
	}

	cleanup() {
		this.recorder.clear();
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Arrival): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element.treeItemAdapter();
	}

	private getInitialChildren(): Arrival[] {
		return this.recorder.list;
	}

	getChildren(element?: Arrival | undefined): vscode.ProviderResult<Arrival[]> {
		if (!element) {
			return this.getInitialChildren();
		}

		return element.children;
	}
}


