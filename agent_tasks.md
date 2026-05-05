2026-05-05
- Added a folder-node context menu action to import a `.vdjfolder` playlist by selecting a file.
- Implemented `.vdjfolder` parsing in Electron, matched imported entries to library tracks by stored path, skipped missing tracks, and created the playlist under the clicked folder while preserving the imported order.
- Wired the VirtualDJ file pickers to open in the VirtualDJ root or `MyLists` folder by default, using the saved `database.xml` path when available and platform fallbacks otherwise.
