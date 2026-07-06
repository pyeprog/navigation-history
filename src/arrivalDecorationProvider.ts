import * as vscode from 'vscode';
import { ArrivalCollection } from './arrivalCollection';

export type ColorReprOptions = {
    warmColorThreshold: number;
    hotColorThreshold: number;
    colorize: boolean;
    emphasizePauseState: boolean;
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

    provideFileDecoration(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme !== 'tracableSymbol') {
            return undefined;
        }

        const arrival = this.arrivalCollection.getByTracingUri(uri);
        if (!arrival) {
            return undefined;
        }

        const visitingCount = (arrival.selfEncoreCount > 98 ? 98 : arrival.selfEncoreCount) + 1;

        const symbolName = arrival.symbol.name;
        const excalmationMarks = '!'.repeat(Math.round(visitingCount / 20));

        return {
            badge: `${visitingCount}`,
            tooltip: `${symbolName} has been checked for ${visitingCount} times ${excalmationMarks}`,
            color: this.color(arrival.selfEncoreCount)
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
        if (this.reprOptions.emphasizePauseState) {
            return new vscode.ThemeColor('checkbox.disabled.background');
        } else if (this.reprOptions.colorize) {
            return this.encoreColor(encoreCount);
        }

        return undefined;
    }

    private encoreColor(encoreCount: number): vscode.ThemeColor | undefined {
        let colorScheme: [vscode.ThemeColor, number][] = [
            [new vscode.ThemeColor('testing.iconPassed'), this.reprOptions.warmColorThreshold],
            [new vscode.ThemeColor('errorForeground'), this.reprOptions.hotColorThreshold],
        ];

        colorScheme = colorScheme.sort(([_color1, encoreThreshold1], [_color2, encoreThreshold2]) => encoreThreshold2 - encoreThreshold1);

        for (const [color, encoreThreshold] of colorScheme) {
            if (encoreCount >= encoreThreshold) {
                return color;
            }
        }

        return undefined;
    }

    refresh() {
        // fire undefined to refresh every decoration: firing only the currently known uris
        // would leave stale badges behind after arrivals are deleted or their ranges shift
        this._onDidChangeFileDecorations.fire(undefined);
    }
}
