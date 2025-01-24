import * as vscode from 'vscode';
import { ArrivalCollection } from './arrivalCollection';

export class ArrivalDecorationProvider implements vscode.FileDecorationProvider {
    private arrivalCollection: ArrivalCollection;
    private _colorScheme: [vscode.ThemeColor, number][];
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined = this._onDidChangeFileDecorations.event;

    constructor(arrivalCollection: ArrivalCollection) {
        this.arrivalCollection = arrivalCollection;

        this._colorScheme = [
            [new vscode.ThemeColor('testing.iconPassed'), 20],
            [new vscode.ThemeColor('errorForeground'), 50],
        ];
    }

    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme !== 'tracableSymbol') {
            return {};
        }

        const arrival = this.arrivalCollection.getByTracingUri(uri);
        if (!arrival) {
            return {};
        }

        const visitingCount = (arrival.selfEncoreCount > 98 ? 98 : arrival.selfEncoreCount) + 1;

        // tracing symbol's uri guarantees that it has no less than 2 parts and the second last part is the symbol name
        const symbolName = uri.path.split('/').at(-2);

        return {
            badge: `${visitingCount}`,
            tooltip: `${symbolName} has been checked for ${visitingCount} times`,
            color: this.color(arrival.selfEncoreCount, this._colorScheme),
        };
    }

    private color(encoreCount: number, colorScheme: [vscode.ThemeColor, number][]): vscode.ThemeColor | undefined {
        colorScheme = colorScheme.sort(([color1, encoreThreshold1], [color2, encoreThreshold2]) => encoreThreshold2 - encoreThreshold1);
        for (const [color, encoreThreshold] of colorScheme) {
            if (encoreCount >= encoreThreshold) {
                return color;
            }
        }

        return undefined;
    }

    refresh() {
        const uris: vscode.Uri[] = this.arrivalCollection.all().map(arrival => arrival.symbol.tracingUri);
        this._onDidChangeFileDecorations.fire(uris);
    }
}
