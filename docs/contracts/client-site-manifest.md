# Client Site Onboarding Manifest v1.0

The client site manifest is the versioned, secret-free handoff between an imported React site and a
single-client Core Platform deployment. The canonical Zod schema and structured validation API live in
[`shared/client-site-manifest.ts`](../../shared/client-site-manifest.ts).

The manifest records client identity, immutable source revision, compatibility ranges, public and admin
origins, same-origin `/api` routing, build/start commands, routes and navigation, assets, semantic theme
metadata, editable Puck registrations, forms, integrations, modules, and references to secrets held by the
deployment environment.

## Compatibility

Version `1.0` is the only accepted schema version. Readers fail closed on unknown versions. Component,
theme, registry, content, and Core Platform compatibility use semantic versions so a release gate can
compare the site bundle with the target platform before deployment. A draft manifest may use reserved
`.example` origins and `decision-required` as its Puck publish mode; neither is production approval.

## Secret Boundary

Secret values never belong in this file. Declare an environment-variable name in `secretReferences`, then
refer to its ID from forms, integrations, or modules through `secretRefs`. The schema rejects undeclared
references, secret-shaped property names, common provider secret formats, database URLs with embedded
credentials, and unknown object properties. Validation output contains paths and messages without echoing
input values.

## Validation

Run the fail-closed validator from the repository root:

```sh
npm run manifest:validate -- docs/pilots/better-farms/client-site-manifest.example.json
```

Exit code `0` means the manifest is valid. Exit code `1` means the JSON was read but violates the
contract. Exit code `2` means usage, file access, or JSON parsing failed. Successful output includes only
the schema version and client stack ID; failure output includes structured error paths, codes, and safe
messages.

The [Better Farms example](../pilots/better-farms/client-site-manifest.example.json) is an adapter-facing
fixture based on source revision `12fe886e1984c043b89394b91caa4c740acca1c1`. It documents current site
routes and assets while marking unresolved publishing and ecommerce behavior explicitly. It does not
change the Better Farms repository or authorize deployment.
