# Releasing `@semantic-dapp/*`

All publishable packages live under `packages/*` and share one version. They are
published to npm from CI via **OIDC trusted publishing** — no long-lived tokens in
GitHub after the one-time bootstrap.

- Publishable: `spec`, `execution`, `export`, `analyzer`, `resolver`, `classifier`,
  `components`, `renderer`, `cli` (9 packages).
- Not published: `apps/*` (`studio`, `generated-app`) are `private: true`.

## Why the first publish is manual

npm's Trusted Publisher settings only appear on a package's page **after it exists**
on the registry. A brand-new package therefore needs one manual publish to reserve
the name; only then can OIDC take over. See
[npm/cli#8544](https://github.com/npm/cli/issues/8544).

## One-time bootstrap (first ever publish)

npm requires 2FA (or a bypass-2FA token) to publish. The granular-token "Bypass 2FA"
option is currently unreliable for personal scopes, so the simplest working path is
2FA + a one-time password (OTP):

1. Enable 2FA on the npm account (Account → Two-Factor Authentication, authenticator
   app is fine).
2. Make sure a token with **read/write** to the `@semantic-dapp` scope is in
   `~/.npmrc`:
   ```
   //registry.npmjs.org/:_authToken=npm_XXXXXXXX
   ```
3. Build and publish all packages with a current OTP code:
   ```bash
   pnpm -w build
   pnpm -r publish --no-git-checks --otp=123456
   ```
   `pnpm -r publish` skips packages whose version already exists, so if a code
   expires mid-run you can re-run with a fresh `--otp` and it resumes safely.
4. Verify:
   ```bash
   npm view @semantic-dapp/cli
   ```

## One-time OIDC setup (per package)

After the packages exist, configure trusted publishing so CI can release without
tokens. For **each** of the 9 packages:

1. Open `https://www.npmjs.com/package/@semantic-dapp/<name>` → **Settings** →
   **Trusted Publisher**.
2. Select **GitHub Actions** and set:
   - Organization / repository: `TacitvsXI/semantic-dapp`
   - Workflow filename: `release.yml`
   - Environment: _(leave blank)_
   - Allowed actions: **npm publish**
3. (Optional, recommended) Set publishing access to **disallow tokens** so only the
   trusted workflow can publish.

## Cutting a release (after bootstrap)

1. Bump the version in every publishable `package.json` (keep them in sync) and
   commit.
2. Tag and push:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. The [`Release`](../.github/workflows/release.yml) workflow builds, tests and runs
   `pnpm -r publish --provenance` using OIDC — no npm token needed. Provenance
   attestations are attached automatically.

> Note: never add an `NPM_TOKEN` secret to the release workflow. A static
> `_authToken` makes `pnpm publish` fall back from OIDC to token auth (and would drop
> provenance).
