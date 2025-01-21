import * as vscode from 'vscode';
import { ArrivalCollection } from './arrivalCollection';

export class ArrivalDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined = this._onDidChangeFileDecorations.event;
    
    constructor(private arrivalCollection: ArrivalCollection) {}

    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme !== 'tracableSymbol') {
            return {};
        }

        const arrival = this.arrivalCollection.get(uri);
        if (!arrival) {
            return {};
        }

        const encoreCount = arrival.encoreCount;
        const symbolName = uri.path.split('/').at(-2);

        return {
            badge: `${encoreCount}`,
            tooltip: `${symbolName} has been encored ${encoreCount} times`,
            color: this.color(encoreCount),
        };
    }
    
    private color(encoreCount: number): vscode.ThemeColor {
        let color: vscode.ThemeColor;

        // TODO: pick better color
        if (encoreCount < 3) {
            color = new vscode.ThemeColor('charts.blue'); // A cold blue color
        } else if (encoreCount < 6) {
            color = new vscode.ThemeColor('charts.cyan'); // A cool cyan color
        } else {
            color = new vscode.ThemeColor('charts.red'); // A warm red color from VS Code's theme
        }

        return color;
    }
    
    refresh() {
        const uris: vscode.Uri[] = this.arrivalCollection.all().map(arrival => arrival.symbol.tracingUri);
        this._onDidChangeFileDecorations.fire(uris);
    }
}
