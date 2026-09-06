# Category graph repair visibility

The admin category list uses visited IDs and iterative traversal for both tree rows and excluded parent choices. Normal roots and their sorted descendants render first, followed by missing-parent trees as before. Any still-unvisited component then renders once, including closed cycles and self-parented rows. Each category remains available for editing; selecting “No parent category” submits the existing update contract with `parentId: null`.

Editing excludes the category itself and every reachable descendant from parent choices. Inactive parent options and existing search/status filtering semantics are unchanged. No API or database contract changes are included; backend graph-write validation is a separate workstream.

Focused mounted component tests cover closed cycles, self-parented rows, root repair request, normal sibling/tree/orphan ordering, inactive choices and parent-name search. These tests exercise the real component and select controls with synthetic query data and a captured mutation request; they do not claim database persistence or full browser acceptance.

The six category editor labels are associated with their input, select trigger or switch, giving the controls accessible names and label focus behavior. This additive presentation fix passed the existing three component cases plus focused formatting and lint checks. Actual browser repair and reload acceptance is still pending integration with backend graph validation.
