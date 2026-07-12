2026-05-05
- Added a folder-node context menu action to import a `.vdjfolder` playlist by selecting a file.
- Implemented `.vdjfolder` parsing in Electron, matched imported entries to library tracks by stored path, skipped missing tracks, and created the playlist under the clicked folder while preserving the imported order.
- Wired the VirtualDJ file pickers to open in the VirtualDJ root or `MyLists` folder by default, using the saved `database.xml` path when available and platform fallbacks otherwise.

2026-05-23
- Fixed drag-drop track import from Finder so dropped files can resolve against VirtualDJ `database.xml` even when the XML encodes file paths with entities such as `&apos;`, `&amp;`, or numeric character references.
- Reworked the Electron VDJ song lookup to decode XML attribute values, normalize Unicode file paths before comparison, and decode imported metadata fields like title, artist, and comments.
- Validated the fix against the reported `2026.05.23_nordic_shazams` files and confirmed BPM and duration metadata are now found for the previously failing tracks.
- Added embedded audio metadata parsing for dropped tracks so tags stored in the file Comments field are imported as comma-separated library tags even when VirtualDJ has no comment for that track.
