import * as vscode from 'vscode';
import { NavigationItem } from './navigationItem';
import { NavigationRecorder } from './navigationRecorder';
import { debugLog } from './debug';
import { extractSymbols } from './symbolUtil';

export class NavigationHistoryProvider implements vscode.TreeDataProvider<NavigationItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<NavigationItem | undefined | null | void> = new vscode.EventEmitter<NavigationItem | undefined | null | void>();
	readonly onDidChangeTreeData?: vscode.Event<void | NavigationItem | NavigationItem[] | null | undefined> | undefined = this._onDidChangeTreeData.event;
	private recorder: NavigationRecorder = new NavigationRecorder();

	constructor() {
		this.registerRecorder(this.recorder);
	}

	registerRecorder(recorder: NavigationRecorder) {
		const disposable1 = vscode.window.onDidChangeTextEditorSelection(async event => {
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

			this.recorder.record({
				symbol: symbol,
				word: word,
				uri: event.textEditor.document.uri,
				range: symbol.range,
				type: symbol.kind,
			});

			this._onDidChangeTreeData.fire();
		});

		// TODO: remember to give disposble to context
	}

	getTreeItem(element: NavigationItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element.treeItemAdapter();
	}

	getRoot(): NavigationItem[] {
		return this.recorder.list;
	}

	getChildren(element?: NavigationItem | undefined): vscode.ProviderResult<NavigationItem[]> {
		if (!element) {
			return this.getRoot();
		}

		return element.children;
	}
}


