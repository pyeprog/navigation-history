import * as vscode from 'vscode';
import { ArrivalCollection } from './arrivalCollection';
import { Arrival } from './arrival';

export class ArrivalStatusBarItem {
    private _statusBarItem: vscode.StatusBarItem;
    private _arrivalCollection: ArrivalCollection;

    constructor(arrivalCollection: ArrivalCollection) {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this._arrivalCollection = arrivalCollection;
    }

    refresh() {
        const hottestArrival = this._arrivalCollection.all().reduce((hottest: Arrival, current: Arrival) => {
            return current.selfEncoreCount >= hottest.selfEncoreCount ? current : hottest;
        });

        if (!hottestArrival) {
            this._statusBarItem.text = ``;
            this._statusBarItem.hide();
            return;
        }

        this._statusBarItem.text = `$(ruby) ${hottestArrival.symbol.name}`;
        this._statusBarItem.command = {
            command: 'vscode.open',
            arguments: [
                hottestArrival.symbol.uri,
                {
                    selection: new vscode.Range(hottestArrival.symbol.range.start, hottestArrival.symbol.range.start),
                    preview: true
                }],
            title: 'Open File'
        };
        this._statusBarItem.tooltip = `${hottestArrival.symbol.name} has been checked for ${hottestArrival.selfEncoreCount + 1} times`;
        this._statusBarItem.show();
    }

    dispose(context: vscode.ExtensionContext) {
        context.subscriptions.push(this._statusBarItem);
    }
}
