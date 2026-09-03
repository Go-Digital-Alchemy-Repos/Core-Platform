# Client Site Preview Bridge v1.0

The preview bridge lets the authenticated Core Platform editor display client-site content without
giving the editor control over the client renderer, routes, behavior, or CSS.

Core Platform loads and validates the client manifest, verifies the running Core version, confirms that
the requested component is allowed in the requested route, and builds a strict version `1.0` preview
message. `ClientSitePreviewFrame` sends that message only to the iframe URL's exact origin.

The client site separately checks the sender against its configured admin origin, requires the expected
client, route, and component identifiers, and validates the component content before rendering. Unknown
protocol versions, components, fields, origins, and arbitrary JSX are rejected.

The bridge is preview-only. It does not persist content, publish, rebuild the site, or change public
routing.

## Publish-Model Decision

The Project Owner must choose one model before persistence and rollback are implemented:

| Model          | Operational effect                                                                 |
| -------------- | ---------------------------------------------------------------------------------- |
| Runtime API    | Immediate revisions and direct rollback; public pages depend on Core API/cache.    |
| Static rebuild | Public artifact is self-contained; publish waits for a successful rebuild/deploy.  |
| Hybrid         | Runtime preview with static publication; adds synchronization and recovery states. |

For the Better Farms pilot, runtime API publication is the recommended first choice because Core already
owns CMS revisions and the approved topology provides same-origin `/api`. It avoids adding hosting-provider
build credentials and webhook state during the pilot. This recommendation is not an approved publishing
decision.
