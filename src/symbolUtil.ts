import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';

export async function extractSymbols(doc: vscode.TextDocument, position: vscode.Position): Promise<vscode.DocumentSymbol | null> {
    function findSymbol(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | null {
        for (const symbol of symbols) {
            // symbol might be undefine, thus we must filter these undefine out.
            if (!symbol || !symbol.range.contains(position)) {
                continue;
            }

            let childSymbol: vscode.DocumentSymbol | null = null;
            if (symbol.children) {
                childSymbol = findSymbol(symbol.children, position);
            }

            // it's possible that cursor sits at parent symbol, but not in every child symbol
            // thus if none childSymbol found, return the parent symbol.
            return childSymbol || symbol;
        }

        return null;
    }

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
    );
    const tracableSymbols = symbols.map(symbol => TracableSymbol.createFrom(symbol));

    return findSymbol(tracableSymbols, position);
}

