import * as vscode from 'vscode';
import { TracableSymbol } from './tracableSymbol';
import { Arrival } from './arrival';
import { debugLog } from './debug';

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


export async function parseArrivalFromEditorState(editor: vscode.TextEditor) {
    // only pick the first selection, if there are multiple selections, we treat first selection as the pivot
    // const position = event.selections[0].anchor;
    const position = editor.selections[0].anchor;

    // when cursor on space or punctuations like '=', wordRange would be undefined
    const wordRange = editor.document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return;
    }

    // get the word at the position, which might be different from the symbol at the position
    // this is because when cursor is on the word in a function, the symbol is the function, but the word is the inner word of the function
    const word = editor.document.getText(wordRange);

    // get the symbol at the position
    const symbol = await extractSymbols(editor.document, position);
    if (!symbol) {
        return;
    }

    debugLog(`On Word: ${word}  On Symbol: ${symbol.name}`, false);

    return Arrival.createFrom({
        symbol: symbol,
        word: word,
    });

}

