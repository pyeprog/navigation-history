import * as vscode from 'vscode';
import { ArrivalHistoryProvider } from './arrivalHistoryProvider';
import { ArrivalRecorder } from './arrivalRecorder';
import { parseArrivalFromEditorState } from './util';
import { SortField, SortOrder, TreeItemInterface } from './arrival';
import { ArrivalDecorationProvider } from './arrivalDecorationProvider';
import { ArrivalStatusBarItem } from './arrivalStatusBarItem';
import { logInfo } from './debug';


// selection events from these editors are not code navigation and should be ignored
const IGNORED_URI_SCHEMES = new Set(['output', 'debug', 'search-editor', 'vscode-settings', 'comment']);

// selection events fire on every cursor move and keystroke; wait for the cursor to
// settle before querying the (potentially slow) document symbol provider
const SELECTION_SETTLE_DELAY_MS = 150;

export class ViewUpdater {
    private treeView: vscode.TreeView<TreeItemInterface | null | undefined>;
    private recorder: ArrivalRecorder;
    private arrivalHistoryProvider: ArrivalHistoryProvider;
    private decorationProvider: ArrivalDecorationProvider;
    private statusBarItem: ArrivalStatusBarItem;
    private paused: boolean = false;
    private debounceTimer: NodeJS.Timeout | undefined = undefined;
    private handlingSequence: number = 0;

    constructor(
        treeView: vscode.TreeView<TreeItemInterface | null | undefined>,
        recorder: ArrivalRecorder,
        arrivalHistoryProvider: ArrivalHistoryProvider,
        decorationProvider: ArrivalDecorationProvider,
        statusBarItem: ArrivalStatusBarItem,
    ) {
        this.treeView = treeView;
        this.recorder = recorder;
        this.arrivalHistoryProvider = arrivalHistoryProvider;
        this.decorationProvider = decorationProvider;
        this.statusBarItem = statusBarItem;
    }

    togglePauseState() {
        this.paused = !this.paused;
    }

    get pausedState(): boolean {
        return this.paused;
    }

    private eventHandler(event: vscode.TextEditorSelectionChangeEvent) {
        if (!event || this.paused) {
            return;
        }

        if (IGNORED_URI_SCHEMES.has(event.textEditor.document.uri.scheme)) {
            return;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.handleArrival(event.textEditor).catch((error) => {
                logInfo(`failed to record arrival: ${error}`);
            });
        }, SELECTION_SETTLE_DELAY_MS);
    }

    // the document symbol provider returns nothing while its language server is still
    // starting up (right after opening the workspace or switching to a fresh file);
    // retry with backoff so arrivals from that warm-up window are not lost.
    // indexing a large project can take tens of seconds, hence the long tail;
    // any newer selection event aborts the pending retries, so the cost stays low
    private static readonly SYMBOL_WARMUP_RETRY_DELAYS_MS = [300, 700, 1500, 3000, 5000, 5000, 5000, 5000];

    private async handleArrival(editor: vscode.TextEditor) {
        const sequence = ++this.handlingSequence;

        let arrival = await parseArrivalFromEditorState(editor);

        for (const retryDelayMs of ViewUpdater.SYMBOL_WARMUP_RETRY_DELAYS_MS) {
            if (arrival || sequence !== this.handlingSequence || this.paused || editor.document.isClosed) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            if (sequence !== this.handlingSequence || editor.document.isClosed) {
                break;
            }
            arrival = await parseArrivalFromEditorState(editor);
        }

        // a newer selection event was handled while we awaited the symbol provider,
        // recording this stale arrival now would corrupt the "latest arrival" ordering
        if (!arrival || sequence !== this.handlingSequence || this.paused) {
            return;
        }

        const savedArrival = this.recorder.record(arrival);
        if (savedArrival === arrival) {
            logInfo(`recorded new arrival '${savedArrival.symbol.name}'`);
        } else {
            logInfo(`revisited existing entry '${savedArrival.symbol.name}' (visit count ${savedArrival.selfEncoreCount + 1}) — no new item is added for revisits, its badge is bumped instead`);
        }

        this.arrivalHistoryProvider.refresh();
        this.decorationProvider.refresh();
        this.statusBarItem.refresh();

        if (this.treeView.visible) {
            // treeView.reveal is a way to show a selected status, do auto-focusing and auto-expanding
            // if the treeView is not visible(hidden), we should stop doing revealing, since it will expand the hidden view automatically
            try {
                await this.treeView.reveal(savedArrival, { select: true, focus: false, expand: true });
            } catch (_error) {
                // reveal fails when the arrival is hidden by the history threshold; that's fine
            }
        }
    }

    registerSelf() {
        const selectionSubscription = vscode.window.onDidChangeTextEditorSelection(this.eventHandler.bind(this));
        return vscode.Disposable.from(
            selectionSubscription,
            new vscode.Disposable(() => {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
            }),
        );
    }
}


export function registerConfigChangeHandler(
    arrivalHistoryProvider: ArrivalHistoryProvider,
    arrivalDecorationProvider: ArrivalDecorationProvider,
    arrivalStatusBarItem: ArrivalStatusBarItem,
) {
    // one configuration-change event may carry several changed settings (e.g. when
    // settings.json is edited by hand), so every setting is checked independently
    return vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('navigationHistory.showStatusBarItem')) {
            const showStatusBar = vscode.workspace.getConfiguration('navigationHistory').get('showStatusBarItem');
            if (showStatusBar) {
                arrivalStatusBarItem.enable();
            } else {
                arrivalStatusBarItem.disable();
            }
        }

        if (event.affectsConfiguration('navigationHistory.item.showFilenameInItemDescription')) {
            const showFilenameInItemDescription = vscode.workspace.getConfiguration('navigationHistory.item').get('showFilenameInItemDescription');
            arrivalHistoryProvider.updateReprOptions({
                showFilename: showFilenameInItemDescription as boolean
            });
        }

        if (event.affectsConfiguration('navigationHistory.item.showPositionInItemDescription')) {
            const showPositionInItemDescription = vscode.workspace.getConfiguration('navigationHistory.item').get('showPositionInItemDescription');
            arrivalHistoryProvider.updateReprOptions({
                showPosition: showPositionInItemDescription as boolean
            });
        }

        if (event.affectsConfiguration('navigationHistory.delimiter.enableDelimiter')) {
            const enableDelimiter = vscode.workspace.getConfiguration('navigationHistory.delimiter').get('enableDelimiter');
            arrivalHistoryProvider.updateReprOptions({
                enableDelimiter: enableDelimiter as boolean
            });
        }

        if (event.affectsConfiguration('navigationHistory.delimiter.delimiterString')) {
            const delimiterString = vscode.workspace.getConfiguration('navigationHistory.delimiter').get('delimiterString');
            arrivalHistoryProvider.updateReprOptions({
                delimiterString: delimiterString as string
            });
        }

        if (event.affectsConfiguration('navigationHistory.sorting.defaultSortField')) {
            const sortField = vscode.workspace.getConfiguration('navigationHistory.sorting').get('defaultSortField');
            arrivalHistoryProvider.updateReprOptions({
                sortField: sortField as SortField
            });
        }

        if (event.affectsConfiguration('navigationHistory.sorting.defaultSortOrder')) {
            const sortOrder = vscode.workspace.getConfiguration('navigationHistory.sorting').get('defaultSortOrder');
            arrivalHistoryProvider.updateReprOptions({
                sortOrder: sortOrder as SortOrder
            });
        }

        if (event.affectsConfiguration('navigationHistory.history.hideHistory')) {
            const isHiding = vscode.workspace.getConfiguration('navigationHistory.history').get('hideHistory');
            arrivalHistoryProvider.updateReprOptions({
                hideHistory: isHiding as boolean
            });
        }

        if (event.affectsConfiguration('navigationHistory.history.unpinnedItemHidingThreshold')) {
            const unpinHideThreshold = vscode.workspace.getConfiguration('navigationHistory.history').get('unpinnedItemHidingThreshold');
            arrivalHistoryProvider.updateReprOptions({
                unpinHideThreshold: unpinHideThreshold as number
            });
        }

        if (event.affectsConfiguration('navigationHistory.color.enableColorizing')) {
            const colorize = vscode.workspace.getConfiguration('navigationHistory.color').get('enableColorizing');
            arrivalDecorationProvider.updateReprOptions({
                colorize: colorize as boolean
            });
        }

        if (event.affectsConfiguration('navigationHistory.color.warmColorThreshold')) {
            const warmColorThreshold = vscode.workspace.getConfiguration('navigationHistory.color').get('warmColorThreshold');
            arrivalDecorationProvider.updateReprOptions({
                warmColorThreshold: warmColorThreshold as number
            });
        }

        if (event.affectsConfiguration('navigationHistory.color.hotColorThreshold')) {
            const hotColorThreshold = vscode.workspace.getConfiguration('navigationHistory.color').get('hotColorThreshold');
            arrivalDecorationProvider.updateReprOptions({
                hotColorThreshold: hotColorThreshold as number
            });
        }
    });
}
