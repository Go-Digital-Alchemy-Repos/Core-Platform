# Security Center read recovery

Security activity and manual fraud blocks have independent loading, error and retry states. An unavailable initial read does not imply zero activity or no blocks. A successful empty response still displays its ordinary empty state.

When a refresh fails, the last successfully loaded metrics, events and blocks remain visible with an explicit stale-data message and retry control. Settings loading/saving and existing authorization, feature and provider transaction policies are unchanged. Retained blocks can still be managed through the existing server-validated actions.

Four focused regressions cover initial loading, initial failure plus successful retries, successful empty reads, and retained data after background failure. The three failure/loading regressions were first run against the original source and failed on their expected UI assertions; the patched settings suite passes. Actual isolated-app browser acceptance passed on desktop and mobile (2 tests): failed GETs, retry to real synthetic data, and retained metrics/blocks after another failed refresh. The exact owned PostgreSQL container, anonymous volume and process groups were verified absent afterward. No provider calls or production operations occurred. Integration remains a separate review step.
