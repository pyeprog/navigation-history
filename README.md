# Navigation History 🧭

## define what this extension is for

help you read code more easily by providing navigation history in a nicer way.

## describe the scenario that this extension is useful

when you start working on a new codebase, you need to go through the codebase to understand the overall architecture. And most of the time you do these 2 things:

0. find the entry point for specific feature and start reading from there
1. you jump around the codebase to trace the calling hierarchy to understand the implementation

while you are doing these, it's hard to:

0. keep track of where you've been, especially when the calling hierarchy is deep and even more unfortunately you have to search around different parts of the codebase to find the entry point.
1. understand the big picture of the codebase, because you can't remember all the structure all at once when you first start working on it.
2. tell which part is more important and you should pay more attention to unless somebody help you out.

## main features

1. remember where you've been in the codebase.
2. show the calling hierarchy of each symbol as you go through the codebase.
3. count how many times you've visited each symbol, the most visited ones will be highlighted.

better to be gif.
![calling hierarchy](./images/calling-hierarchy.png)
![visit count](./images/visit-count.png)
![status bar](./images/status-bar.png)

## compare this extension with other extensions

### compare with default vscode "open editors"

it's not helping with the code navigation, it's simply a better view to see all the opened files.

### compare with extension "code navigation stack"

it's a simple extension that keeps the calling hierarchy as long as you're navigating the same calling tree, but if you jump out of the calling tree, all the history is gone.

### compare with extension "codemap"

by default, it's a simpler version of outline, but it's able to customize the structure parsing logic by setting rules.

### compare with default vscode "outline"

it shows the outlines of the symbols in the current file, but not the calling hierarchy.

## 🐛 Any Issues?

So far, smooth sailing! But if you spot anything, just let us know on our GitHub repo.

## 📝 What's New?

Check out [CHANGELOG.md](CHANGELOG.md) to see what we've been up to!

---

## 🤝 Want to Help?

Got ideas or found a bug? We'd love to hear from you! Open an issue on our GitHub repository.

## 📜 License

This extension is available under the MIT License.

**Happy Exploring!** 🚀✨

---

Hey there! 👋 Looking for a better way to explore your code? This VS Code extension is here to help! It makes reading and navigating through your codebase a breeze by showing you where you've been and helping you understand your code better.

## ✨ What's Cool About This?

### 🗺️ Your Personal Code Map

- Keep track of everywhere you've been in your code
- See how different parts of your code connect
- Never lose your way in the codebase again
- Easily retrace your steps when you need to

### 🎯 Smart Highlights

- Your most-visited code spots get special highlighting
- Different colors show how often you visit each part
- Instantly spot the important bits of your code

## 🤔 Why Do You Need This?

Ever found yourself thinking:

- "Wait, where was I just looking?"
- "How did I get to this part of the code?"
- "What's the big picture here?"

VS Code's "Recently Opened" is nice, but sometimes you need a friendlier way to keep track of your coding journey. That's where we come in!

## 🚀 Let's Get Started

It's super easy:

1. Grab the extension from VS Code Marketplace
2. Open up your project
3. Start exploring your code
4. Check out your navigation history in the Activity Bar

## ⚙️ Make It Yours

Customize the extension with these settings:

- `navigationHistory.showStatusBarItem`: Want to see updates in your status bar? ✅
- `navigationHistory.item.showFilenameInItemDescription`: Show file names in descriptions
- `navigationHistory.item.showPositionInItemDescription`: Include position info
- `navigationHistory.sorting.defaultSortField`: Sort by time or visit count ('time' or 'encore')
- `navigationHistory.sorting.defaultSortOrder`: Choose ascending or descending order
- `navigationHistory.delimiter.delimiterString`: Add separators between symbol trees
- `navigationHistory.folding.defaultFolding`: Keep things tidy with automatic folding
- `navigationHistory.folding.unpinnedItemFoldingThreshold`: Set when items should fold away
- `navigationHistory.color.enableColorizing`: Add color coding based on how often you visit (changes at 20 and 60 visits)
