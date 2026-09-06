# Onboarding evidence and plan changes

Generating a domain plan starts a new set of readiness checks, all marked pending.
Previously displayed DNS results, saved evidence and readiness conclusions are
cleared, including when generating the replacement plan fails. Complete the
checks for the newly generated plan before evaluating readiness again.

Responses from an earlier plan cannot replace the current plan's displayed
results. New checks remain available while an older request finishes. Changing a
readiness selection immediately clears the previous conclusion and prevents an
in-flight evaluation of the old selections from being displayed.

These checks record operator observations. They do not change DNS or authorize a
deployment. Previously recorded server evidence remains associated with its
original stack; replacing the displayed plan does not delete that history.
