import * as vscode from 'vscode';
import { ArrivalCollection } from './arrivalCollection';

type ColorReprOptions = {
    warmColorThreshold: number;
    hotColorThreshold: number;
    colorize: boolean;
}

export class ArrivalDecorationProvider implements vscode.FileDecorationProvider {
    private arrivalCollection: ArrivalCollection;
    private reprOptions: ColorReprOptions;
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined = this._onDidChangeFileDecorations.event;

    constructor(arrivalCollection: ArrivalCollection, reprOptions: ColorReprOptions) {
        this.arrivalCollection = arrivalCollection;
        this.reprOptions = reprOptions;
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
        const excalmationMarks = '!'.repeat(Math.round(visitingCount / 20));

        return {
            badge: `${visitingCount}`,
            tooltip: `${symbolName} has been checked for ${visitingCount} times ${excalmationMarks}`,
            color: this.reprOptions.colorize ? this.color(arrival.selfEncoreCount) : undefined,
        };
    }

    setReprOptions(options: ColorReprOptions) {
        this.reprOptions = options;
        this.refresh();
        return this;
    }
    
    updateReprOptions(options: Partial<ColorReprOptions>) {
        this.reprOptions = { ...this.reprOptions, ...options };
        this.refresh();
        return this;
    }

    private color(encoreCount: number): vscode.ThemeColor | undefined {
        let colorScheme: [vscode.ThemeColor, number][] = [
            [new vscode.ThemeColor('testing.iconPassed'), this.reprOptions.warmColorThreshold],
            [new vscode.ThemeColor('errorForeground'), this.reprOptions.hotColorThreshold],
        ];

        colorScheme = colorScheme.sort(([color1, encoreThreshold1], [color2, encoreThreshold2]) => encoreThreshold2 - encoreThreshold1);

        for (const [color, encoreThreshold] of colorScheme) {
            if (encoreCount >= encoreThreshold) {
                return color;
            }
        }

        return undefined;
    }

    refresh() {
        const uris: vscode.Uri[] = this.arrivalCollection.allArrivals().map(arrival => arrival.symbol.tracingUri);
        this._onDidChangeFileDecorations.fire(uris);
    }
}
