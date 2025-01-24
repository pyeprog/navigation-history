import * as vscode from 'vscode';
import { Arrival } from './arrival';
import { ArrivalCollection } from './arrivalCollection';

export class ArrivalHistoryProvider implements vscode.TreeDataProvider<Arrival> {
	private _onDidChangeTreeData: vscode.EventEmitter<Arrival | undefined | null | void> = new vscode.EventEmitter<Arrival | undefined | null | void>();
	readonly onDidChangeTreeData?: vscode.Event<void | Arrival | Arrival[] | null | undefined> | undefined = this._onDidChangeTreeData.event;
	private arrivalCollection: ArrivalCollection;
	private _showFilename: boolean = true;
	private _showPosition: boolean = true;

	constructor(arrivalCollection: ArrivalCollection) {
		this.arrivalCollection = arrivalCollection;
	}
	
	refresh() {
		this._onDidChangeTreeData.fire();
	}


	cleanup() {
		this.arrivalCollection.clear();
		this.refresh();
	}
	
	setShowFilename(showFilename: boolean) {
		this._showFilename = showFilename;
		this.refresh();
		return this;
	}

	setShowPosition(showPosition: boolean) {
		this._showPosition = showPosition;
		this.refresh();
		return this;
	}

	getTreeItem(element: Arrival): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element.treeItemAdapter(this._showFilename, this._showPosition);
	}

	private getInitialChildren(): Arrival[] {
		return this.arrivalCollection.asList();
	}

	getChildren(element?: Arrival | undefined): vscode.ProviderResult<Arrival[]> {
		if (!element) {
			return this.getInitialChildren();
		}

		return element.children;
	}

	getParent(element: Arrival): vscode.ProviderResult<Arrival | null | undefined> {
		return element.parent;
	}
}


