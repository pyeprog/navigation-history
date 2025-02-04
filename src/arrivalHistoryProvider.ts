import * as vscode from 'vscode';
import { Arrival, TreeItemInterface } from './arrival';
import { ArrivalCollection } from './arrivalCollection';
import { toTreeItemCollection, TreeViewReprOptions } from './treeItemCollection';

export class ArrivalHistoryProvider implements vscode.TreeDataProvider<TreeItemInterface> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItemInterface | undefined | null | void> = new vscode.EventEmitter<TreeItemInterface | undefined | null | void>();
	readonly onDidChangeTreeData?: vscode.Event<void | TreeItemInterface | TreeItemInterface[] | null | undefined> | undefined = this._onDidChangeTreeData.event;
	private arrivalCollection: ArrivalCollection;
	private reprOptions: TreeViewReprOptions;

	constructor(arrivalCollection: ArrivalCollection, reprOptions: TreeViewReprOptions) {
		this.arrivalCollection = arrivalCollection;
		this.reprOptions = reprOptions;
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}


	cleanup() {
		this.arrivalCollection.clear();
		this.refresh();
	}

	getReprOptions(): TreeViewReprOptions {
		return this.reprOptions;
	}

	setReprOptions(options: TreeViewReprOptions) {
		this.reprOptions = options;
		this.refresh();
		return this;
	}

	updateReprOptions(options: Partial<TreeViewReprOptions>) {
		this.reprOptions = { ...this.reprOptions, ...options };
		this.refresh();
		return this;
	}

	getTreeItem(element: TreeItemInterface): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element.toTreeItem();
	}

	private getInitialChildren(): TreeItemInterface[] {
		return toTreeItemCollection(this.arrivalCollection, this.reprOptions);
	}

	getChildren(element?: TreeItemInterface | undefined): vscode.ProviderResult<TreeItemInterface[]> {
		if (!element) {
			return this.getInitialChildren();
		}

		if (element instanceof Arrival) {
			return element.children;
		}

		return [];
	}

	getParent(element: TreeItemInterface): vscode.ProviderResult<TreeItemInterface | null | undefined> {
		if (element instanceof Arrival) {
			return element.parent;
		}

		return null;
	}
}


