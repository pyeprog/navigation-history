import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';

export async function extractSymbols(doc: vscode.TextDocument, position: vscode.Position): Promise<TracableSymbol | null> {
    function findSymbol(symbols: TracableSymbol[], position: vscode.Position): TracableSymbol | null {
        for (const symbol of symbols) {
            // symbol might be undefine, thus we must filter out these undefine.
            if (!symbol || !symbol.range.contains(position)) {
                continue;
            }

            let childSymbol: TracableSymbol | null = null;
            if (symbol.children) {
                childSymbol = findSymbol(symbol.children, position);
            }

            // it's possible that cursor sits at parent symbol, but not in every child symbol
            // thus if none childSymbol found, return the parent symbol.
            return childSymbol || symbol;
        }

        return null;
    }

    const symbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
    );
    const tracableSymbols: TracableSymbol[] = symbols.map(symbol => TracableSymbol.createFrom(doc.uri, symbol));

    return findSymbol(tracableSymbols, position);
}

