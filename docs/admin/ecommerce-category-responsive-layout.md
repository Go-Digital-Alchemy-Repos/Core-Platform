# Category editor responsive layout

The category page uses one `minmax(0, 1fr)` column below the XL breakpoint. At XL,
the editor remains 420 px wide and the category list takes the remaining space
with a zero minimum track size. Both cards use `min-w-0` so table content cannot
force the grid wider than its available space. The existing shared Table
component retains its local horizontal scrolling; no global overflow is hidden.

Before this change, the implicit mobile column and the desktop `1fr` minimum
inherited the table's intrinsic width. In the synthetic browser fixture, the
390 px viewport had a 774 px editor extending to x=858. The fix keeps both cards
inside their 290 px available width, ending at x=374. At 1440 px, the editor
remains 420 px and the list ends at x=1416 instead of x=1498.

Actual browser checks at 390 and 1440 px captured before/after screenshots and
measured editor fields, help text and card bounds. The table still has wider
content than its viewport and scrolls independently; scrolling to its end exposes
the complete rightmost action. Keyboard row activation, opening the parent
selector and cancelling the editor also passed at both widths. The three existing
category behavior tests, scoped ESLint, Prettier and diff checks passed.

This is a layout-only change. Category parent rules, API payloads, table actions
and shared components are unchanged. The browser fixtures use synthetic local
data, and their owned database container, anonymous volume and process groups
were verified removed/stopped. These scoped checks are not a full release gate.
