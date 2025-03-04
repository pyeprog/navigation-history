# Change Log

All notable changes to the "navigation-history" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.5] - 2025-03-03

### Modified

- fix the bug that the tree view will be expanded automatically when you arrive at a new symbol.

## [1.0.4] - 2025-02-24

### Modified

- change recording logic when jump from one method of a class to another method of the same class.

## [1.0.3] - 2025-02-23

### Fixed

- fix bug of recording.

## [1.0.2] - 2025-02-23

### Fixed

- fix the bug that when editing, the symbol under cursor will be treated as a new symbol, thus bloat the navigation history tree.

## [1.0.1] - 2025-02-03

### Added

- make colorizing customizable.
- fix bugs.

## [1.0.0] - 2025-01-24

### Added

- add basic navigation tracking logic.
- add basic navigation history tree view.
- add cleanup button at the title bar of navigation history tree view.
- add symbol revealing logic.
- add badge to reveal the visiting count of the symbol.
- add pin/unpin command to put certain symbol at the top of the view.
- improve the readability of navigation history tree view, including a better header, folding and coloring.
- add bunch of commands to manage the navigation history.
- add status bar item to show the hottest symbol visited.
- add configuration options.
