# Pilot cleanup exit publication race

The cleanup helper requires both OS process-group absence and a published Node
leader exit. The previous loop stopped waiting as soon as the group disappeared,
so it could return false before the pending JavaScript exit callback ran. The
second wait could repeat that immediate result without yielding to the callback.

The revised loop polls until both conditions hold or its existing deadline
expires. Group ownership, leader-first graceful signaling, group escalation and
fail-closed handling of permission or other observation errors are unchanged.
A remaining group or an unpublished leader exit still prevents success.

The focused regression uses a real owned child and real OS group probes, with a
controlled delay of Node's internal exit-publication callback after libuv reaps
the child. It demonstrates the ordering bug; it does not establish the cause of
any earlier pilot cleanup discrepancy. Because the timing fixture uses an
internal Node callback, incompatible future Node internals must fail visibly
rather than silently skipping the regression.

Run `npx vitest run server/__tests__/pilot-cleanup.test.ts`. This path is included
by the repository's normal Vitest configuration. Coverage includes delayed and
expired exit publication, ordinary graceful termination, actual SIGKILL and
remaining descendants, unregistered children, permission and unknown probe
errors, and a group that remains observable. This future tooling change does
not alter the frozen f488342 release candidate or its historical evidence.
