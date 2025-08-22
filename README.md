# Consumer-Driven Contract Testing (Pact) - JavaScript-Node

A minimal, production-style project showing how to do Consumer-Driven Contract Testing (CDCT) with Pact and API Hub for Contract Testing (aka the Pact Broker), locally and in GitHub Actions.  
Pacticipants (as they appear in API Hub for Contract Testing): **CDCT-JS-Consumer ↔ CDCT-JS-Provider**

---

## Contents

- [Overview](#overview)
- [Quick Command Reference](#quick-command-reference)
- [How to Use It (local & CI)](#how-to-use-it-local--ci)
  - [Configuration & Environment Variables](#configuration--environment-variables)
  - [Repository Layout](#repository-layout)
  - [Local “Good” Demo (Happy Path)](#local-good-demo-happy-path)
  - [Local “Bad” Demo (Intentional Failures)](#local-bad-demo-intentional-failures)
  - [GitHub Actions CI Pipeline](#github-actions-ci-pipeline)
- [Consumer-Driven Contract Testing Methodology](#consumer-driven-contract-testing-methodology)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

This project demonstrates **Consumer-Driven Contract Testing (CDCT)** using Pact:

- The consumer (**CDCT-JS-Consumer**) defines the API expectations it needs from the provider.
- Those expectations are captured as Pact contracts (JSON) and published to API Hub for Contract Testing.
- The provider (**CDCT-JS-Provider**) runs provider verification against those contracts.
- Results are published back to API Hub for Contract Testing and can gate releases via `can-i-deploy`.

---

## Quick Command Reference

**Good (local):**
```
npm ci
npm run pact:consumer
npm run demo:good:publish
npm run provider:start
npm run demo:good:verify
npm run pact:can-i-deploy   # optional
```

**Bad (local only):**
```
npm ci
npm run demo:bad:publish
npm run provider:start
npm run demo:bad:verify
```

**CI (GitHub Actions):**
- Push to `main`
- Workflow runs:
  - generate & publish pact
  - boot provider, verify against Broker
  - run can-i-deploy

## How to Use It (local & CI)

### Configuration & Environment Variables

| Name                                   | Where                 | Purpose                                               |
|----------------------------------------|-----------------------|-------------------------------------------------------|
| `PACT_BROKER_BASE_URL`                 | `.env` / GitHub Secret| Broker URL                                            |
| `PACT_BROKER_TOKEN`                    | `.env` / GitHub Secret| Auth token                                            |
| `PROVIDER_BASE_URL`                    | env (optional)        | Provider URL (defaults to `http://127.0.0.1:9010`)    |
| `BRANCH`                               | env                   | Branch/tag for publish/verify                         |
| `PROVIDER_VERSION`                     | env                   | Provider version (git SHA in CI)                      |
| `ENVIRONMENT`                          | env                   | Target env for `can-i-deploy`                         |

---

Allow Clean Installs for CI Pipeline:

```
npm ci
```

The provider listens on **http://127.0.0.1:9010** by default.

---

### Repository Layout

```
.
├─ .github/workflows/ci.yml          # CI pipeline
├─ package.json                      # scripts (good + bad demos)
├─ .env                              # local-only secrets
├─ src/
│  ├─ consumer/
│  │  ├─ consumer.pact.test.js       # GOOD contract
│  │  └─ consumer.pact.bad.test.js   # BAD contract
│  └─ provider/
│     ├─ server.js                   # Express provider
│     └─ verify.js                   # Verifier
└─ scripts/
   ├─ publish.cjs
   ├─ can-i-deploy.cjs
   └─ verify-cli.cjs
```

---

### Local “Good” Demo (Happy Path)

<details>
<summary><strong>Step-by-step (what to run locally)</strong></summary>

Generate the contract (consumer):

```
npm run pact:consumer
```

This runs `src/consumer/consumer.pact.test.js`, generating a Pact file under `./pacts`.

Publish the contract (main branch):

```
npm run demo:good:publish
```

Start the provider locally:

```
npm run provider:start
# Fake provider listening on http://127.0.0.1:9010
```

Verify the provider against the Broker contract:

```
npm run demo:good:verify
```

(Optional) Gate a deployment:

```
npm run pact:can-i-deploy
```
</details>

**What you’ll see:**

- The Broker shows a green verification line for **CDCT-JS-Provider** against **CDCT-JS-Consumer** (branch `main`).
- `can-i-deploy` returns **“Computer says yes”** when all required relationships are green.

---

### Local “Bad” Demo (Intentional Failures)

Use this to show mismatches (wrong types / missing fields), **Pending** behavior, and how the UI surfaces failures.

<details>
<summary><strong>Step-by-step (what to run locally)</strong></summary>

Generate & publish the mismatching contract:

```
npm run demo:bad:publish
```

Start the provider locally:

```
npm run provider:start
```

Verify the provider against the bad contract:

```
npm run demo:bad:verify
```
</details>

**What you’ll see:**

- In PactFlow, filter by **All branches/tags** to see both `main` (good) and `demo-bad` (bad).
- The `demo-bad` line will show failed verification(s).
- “Pending” semantics prevent breaking builds for new consumer branches until a successful verification exists.

---

### GitHub Actions CI Pipeline

On every push/PR to `main`, the workflow runs:

**consumer_publish**

```
npm ci
npm run pact:consumer
npm run pact:publish
```

**provider_verify** (depends on `consumer_publish`)

```
npm ci
npm run provider:start
npm run pact:verify
npm run pact:can-i-deploy
```

**Secrets used:**

- `PACT_BROKER_BASE_URL`
- `PACT_BROKER_TOKEN`

---

## Consumer-Driven Contract Testing Methodology
<details>
<summary><strong>Why CDCT?</strong></summary>

Consumer-Driven Contract Testing (CDCT) is about flipping the traditional testing model on its head:

- **Shift left on integration bugs**  
  Instead of discovering mismatches late in a staging or production environment, the *consumer* (the service making API calls) defines the contract up front. This means the team producing the API knows *exactly* what is required, and bugs are caught as soon as contracts are exchanged.

- **High signal, low cost feedback**  
  Full end-to-end integration tests are brittle, expensive, and often slow. CDCT focuses only on the boundary between services. You don’t need to spin up a whole environment—just mock expectations and verify the provider can fulfill them.

- **Independent deployments**  
  With results stored in a Broker, the `can-i-deploy` tool can tell you whether a given provider build is safe to release into an environment. Teams can release independently without waiting on manual integration testing or coordinating schedules.

- **Confidence across branches and environments**  
  By publishing contracts with branch and version metadata, the Broker creates a timeline of compatibility between consumer and provider versions. You always know which versions are safe together.

</details>

<details>
<summary><strong>How Pact works here</strong></summary>

The flow is a **two-part handshake** between the consumer and provider, mediated by the Pact Broker:

1. **Consumer test (pact generation)**  
   - The consumer runs tests (in your repo: `src/consumer/consumer.pact.test.js`).  
   - Pact spins up a **mock HTTP server** that simulates the provider.  
   - The consumer test issues real HTTP requests to this mock.  
   - Expectations are defined using **matchers** (e.g., integer, regex, string), which prevent over-specification while still capturing required fields.  
   - Pact produces a **Pact file** (JSON) describing the expected requests/responses.

2. **Publishing the pact**  
   - The generated Pact file is published to the Broker (e.g., PactFlow) along with metadata: consumer name, branch, version, tags.  
   - This makes the contract discoverable to other teams and CI/CD pipelines.

3. **Provider verification**  
   - The provider service (here, `src/provider/server.js`) is spun up on a real port (e.g., `http://127.0.0.1:9010`).  
   - The Pact verifier pulls down the relevant contract(s) for the consumer/branch.  
   - For each interaction, it sends the expected request to the provider and compares the actual response with the consumer’s expectations.  
   - Results (pass/fail, diffs, provider version/branch) are published back to the Broker.

4. **Release gating (`can-i-deploy`)**  
   - Before releasing, CI asks the Broker: *“Given my provider build SHA and branch, can I safely deploy to environment X?”*  
   - The Broker looks at all consumer/provider relationships. If every required contract is verified, you get ✅ “Computer says yes.”  
   - If any are missing or failing, deployment is blocked until compatibility is resolved.

This cycle ensures the contract is **owned by the consumer**, **fulfilled by the provider**, and **enforced by the Broker**.

</details>

<details>
<summary><strong>Concrete examples</strong></summary>

**Happy path (contract matches reality):**

```
GET /users/123
```

Response the consumer expects:

```
{
  "id": 123,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "active": true
}
```

**Matchers ensure flexibility:**

- `id` → integer (any integer acceptable, example is 123)  
- `name` → like string (any string)  
- `email` → regex for email format  
- `active` → boolean  

The provider returns a compatible payload → verification passes → Broker shows green.

---

**Bad demo (intentional mismatch):**

Consumer expectation:

- `active` must be `"true"` (string instead of boolean)  
- `role` must exist  

Provider response:

```
{
  "id": 123,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "active": true
}
```

Verification fails because:  
- `active` is a boolean, not a string.  
- `role` is missing.  

The Broker records this failure, shows a red line in the relationship view, and `can-i-deploy` would block release.

---

This contrast demonstrates how Pact’s **schema-by-example** approach works: flexible enough to avoid over-constraining, but strict enough to surface real incompatibilities.

</details>

<details>
<summary><strong>Advanced concepts</strong></summary>

**Provider States**  
- Each interaction can declare a *provider state*, which is like a precondition.  
- Example:  
  - *"User with id 123 exists"* → provider must seed a user before responding with 200.  
  - *"User with id 999 does not exist"* → provider ensures the API responds with 404.  
- In the server, states are simulated with canned responses, but in real systems they often involve DB setup, fixtures, or stubbing external dependencies.  
- The verifier triggers these states before verifying each interaction.

---

**Pending Pacts**  
- When a new consumer branch publishes a contract, it is marked as **Pending** for the provider until that provider branch has successfully verified it at least once.  
- Pending contracts won’t fail provider builds right away—this prevents consumers experimenting on feature branches from breaking everyone else.  
- Once a provider has a green verification for that branch, future failures *will* fail the build.

---

**Tags, Branches & Versions**  
- Pacts are published with **branch or tag metadata** (`main`, `demo-bad`, `release/1.2.0`, etc).  
- Consumer and provider versions (often the git SHA) ensure immutability.  
- This metadata allows the Broker to answer questions like:  
  - *“Has the provider verified the consumer’s main branch?”*  
  - *“Which versions of the provider are safe to deploy to staging?”*

---

**Cross-team workflows**  
- The Broker acts as a **shared source of truth** between consumer and provider teams.  
- CI/CD pipelines automatically publish, verify, and gate deployments without needing synchronous conversations.  
- Teams can release independently, knowing compatibility is checked automatically.  
- Webhooks or GitHub Actions can even auto-trigger provider verifications when new consumer pacts arrive.

---

These advanced features make Pact not just a testing library, but a **contract negotiation and release management system** for distributed architectures.

</details>


---

## Troubleshooting

<details>
<summary><strong>Is the provider up on the port you expect?</summary></strong>
  ```
  curl -fsS http://127.0.0.1:9010/health
  # PowerShell:
  curl.exe --noproxy "*" http://127.0.0.1:9010/health
  ```
</details>

<details>
<summary><strong>Are proxies getting in the way?</summary></strong>
  Make sure `HTTP_PROXY` / `HTTPS_PROXY` are unset and  
  `NO_PROXY=127.0.0.1,localhost`.
</details>

<details>
<summary><strong>Did you publish with the branch/tag you intend?</summary></strong>
 For the bad demo you should see `branch: demo-bad` in the publish logs.
</details>

<details>
<summary><strong>Is the consumer version unique?</summary></strong>
 Use a Git SHA or a timestamp.
</details>

<details>
<summary><strong>“Cannot change the content of the pact …”</strong></summary>

**Why:** The Broker refuses to overwrite an existing pact with the same consumer version, to avoid race conditions.  

**Fix:** Publish with a unique `CONSUMER_VERSION`. Our scripts already try Git SHA; if you’re running manually, set it:

```
# macOS/Linux
CONSUMER_VERSION=$(git rev-parse --short HEAD) npm run pact:publish
```

```
# Windows PowerShell
$env:CONSUMER_VERSION = (git rev-parse --short HEAD)
npm run pact:publish
```

If you truly need to re-publish the same code, bump the version (e.g., append a suffix: `abc123-bad`).

</details>

<details>
<summary><strong>Verification hangs / really slow</strong></summary>

**Common causes & fixes:**

- Provider not actually running on the port you told the verifier  

  ```
  npm run provider:start   # defaults to 127.0.0.1:9010
  curl -fsS http://127.0.0.1:9010/health
  ```

- Corporate proxy intercepting localhost  

  ```
  # unset proxy vars
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
  export NO_PROXY=127.0.0.1,localhost
  ```

  On Windows PowerShell, prefer our npm scripts (they use cross-env), or:  

  ```
  Remove-Item Env:\HTTP_PROXY, Env:\HTTPS_PROXY -ErrorAction SilentlyContinue
  $env:NO_PROXY = "127.0.0.1,localhost"
  ```

- TLS inspection / custom CA (Broker requests hang)  

  Provide your CA bundle via `SSL_CERT_FILE`, or temporarily set `PACT_DISABLE_SSL_VERIFICATION=true` (demo only).

- Expected “random” port in logs (e.g., `127.0.0.1:62xxx`)  

  That’s the Pact verifier’s proxy. It’s normal. It still routes to your provider at `127.0.0.1:9010`.

</details>

<details>
<summary><strong>Port already in use (EADDRINUSE)</strong></summary>

Another process is listening on your provider port.

**Options:**

- Kill the process occupying the port, or  
- Start the provider on a different port:

```
# macOS/Linux
PORT=9020 npm run provider:start
```

```
# Windows PowerShell
$env:PORT="9020"; npm run provider:start
```

Update your verifier to use the same port:  
`PROVIDER_BASE_URL=http://127.0.0.1:9020`

</details>

<details>
<summary><strong>Windows inline env var errors (“not recognized…”)</strong></summary>

PowerShell doesn’t support `FOO=bar` syntax. Use:

```
$env:FOO = "bar"
npm run some:script
```

Or just use the provided npm scripts — they use `cross-env` to be cross-platform.

</details>

<details>
<summary><strong>“Ancient lockfile” / <code>npm ci</code> EUSAGE errors</strong></summary>

**Why:** `npm ci` requires `package.json` and `package-lock.json` to be in sync.  

**Fix (locally, then commit):**

```
rm -rf node_modules
npm install
npm test    # optional
git add package-lock.json
git commit -m "chore: refresh lockfile"
git push
```

CI will succeed on the next run.

</details>

<details>
<summary><strong>“Cannot find module 'dotenv'” (or other dev dependency missing)</strong></summary>

**Why:** The CI environment installs only what’s in `package-lock.json`. If `dotenv` (or similar) isn’t listed, Node can’t require it.  

**Fix:**

```
npm install dotenv --save
git add package.json package-lock.json
git commit -m "chore: add dotenv"
git push
```

</details>

<details>
<summary><strong>Invalid Broker URL / “Invalid URL - invalid domain character”</strong></summary>

**Why:** A placeholder (`https://<your-api-hub-contract-testing-url>`) or a typo in the env var.  

**Fix:**

```
# .env or CI Secrets
PACT_BROKER_BASE_URL=https://your-domain.pactflow.io
```

Double-check the exact variable name everywhere.

</details>

<details>
<summary><strong>Node verifier complains: “requires … consumerVersionSelectors / tags”</strong></summary>

**Why:** The Node verifier needs to know which pact(s) to verify from the Broker.  

**Fix:** Use branch/tag selection via env:

```
# macOS/Linux
CONSUMER_BRANCH=main npm run pact:verify
```

```
# Windows PowerShell
$env:CONSUMER_BRANCH="main"; npm run pact:verify
```

Our `verify.js` reads `CONSUMER_BRANCH` (or defaults to main) and configures selectors.

</details>

<details>
<summary><strong>CLI error: “Error reading file from --request-timeout”</strong></summary>

**Why:** A malformed CLI flag earlier (e.g., `--pact--broker-base-url` with a double `--`) caused the verifier to treat `--request-timeout` as a file path.  

**Fix:** Carefully check flags. Correct examples:

```
--pact-broker-base-url https://example.pactflow.io
--broker-token YOUR_TOKEN
--request-timeout 60000
```

</details>

<details>
<summary><strong>“Skipping set up for provider state …” in CLI verifier</strong></summary>

**Why:** The CLI verifier needs a Provider State Setup URL to call.  

**Fix:** Either:  
- Use the Node verifier (our `verify.js` has in-process stateHandlers), or  
- Provide the setup endpoint to the CLI:  
  ```
  --provider-states-setup-url http://127.0.0.1:9010/_pact/setup
  ```
  (Ensure your provider exposes that route.)

</details>

<details>
<summary><strong>Bad demo not showing in the Broker UI</strong></summary>

**Checklist:**

- Did you publish the bad pact with the bad branch?  
  `npm run demo:bad:publish` (sets `BRANCH=demo-bad`)  

- Did you accidentally publish to main?  
  Check publish output lines for `--branch demo-bad`.  

- Is the consumer version unique for the bad demo?  
  Use `CONSUMER_VERSION_SUFFIX=bad` or a fresh SHA.  

- In the UI, set Branch/Tag filter to `demo-bad` or `All`.  

- Names must match: consumer/provider in tests, verify script, and UI.  

</details>

<details>
<summary><strong><code>curl</code> returns nothing locally</strong></summary>

**Why:** Proxy interception or wrong port.  

**Fix:**  

```
# Bypass proxy for localhost (Windows)
curl.exe --noproxy "*" http://127.0.0.1:9010/health
```

Confirm the port your provider prints on startup matches what you’re hitting.

</details>

<details>
<summary><strong>“Proxying GET /users/123” repeating in logs</strong></summary>

**Why:** `HTTP_PROXY` / `HTTPS_PROXY` are set and localhost traffic is being sent to the proxy. The Pact verifier has an internal proxy — external proxies can cause loops.  

**Fix:** Unset `HTTP_PROXY`/`HTTPS_PROXY` and set `NO_PROXY=127.0.0.1,localhost`. Prefer our npm scripts which already sanitize proxy env during verification.

</details>

<details>
<summary><strong>Matchers not found (e.g., <code>MatchersV3.term is not a function</code>)</strong></summary>

**Why:** Using an API that doesn’t exist in your installed Pact version.  

**Fix:** With `@pact-foundation/pact@^15`, prefer:

```
MatchersV3.like('Jane')
MatchersV3.integer(123)
MatchersV3.regex('jane.doe@example.com', '^[^@\s]+@[^@\s]+\.[^@\s]+$')
```

Avoid non-existent helpers (`email`, `term`) unless your version documents them.

</details>

<details>
<summary><strong>“No pacts found for provider …”</strong></summary>

**Why:** Your selection criteria (branch/tag) didn’t match any published pacts.  

**Fix:**

- Confirm the consumer pact was published successfully.  
- Verify the branch you published (e.g., main vs demo-bad).  
- Run verify with matching selector:  

```
# macOS/Linux
CONSUMER_BRANCH=main npm run pact:verify
```

```
# PowerShell
$env:CONSUMER_BRANCH="main"; npm run pact:verify
```

</details>

<details>
<summary><strong>GH Actions: “ancient lockfile” or dependency errors</strong></summary>

**Fix:** Update lockfile locally, commit, push:

```
rm -rf node_modules
npm install
git add package-lock.json
git commit -m "chore: refresh lockfile"
git push
```

</details>

<details>
<summary><strong>GH Actions: provider never gets healthy</strong></summary>

**Why:** Provider failed to start, wrong port, or missing route.  

**Fix:** Inspect logs (step: “Start provider”). Ensure:  
- The port in the workflow (`http://127.0.0.1:9010`) matches your server.  
- `/health` returns 200.  
- No EADDRINUSE or runtime errors are printed.  

</details>

<details>
<summary><strong>Pending pacts confusion (verification “successful” but shows failures)</strong></summary>

**What it means:** If a pact is pending, failures don’t fail the build yet. After your first successful verification for a branch, subsequent failures will fail the build.  

**Action:** If you want a failure to fail the build now, either re-run after a successful verification is published, or disable pending (not recommended for real pipelines).

</details>

<details>
<summary><strong>“to-environment” typo in can-i-deploy</strong></summary>

Make sure you use `--to-environment` (not `--to-envvironment`). Typos can cause confusing errors.

</details>

<details>
<summary><strong>Wrong Broker token / 401s</strong></summary>

**Fix:** Regenerate the token in PactFlow (scoped for read/write as needed), store it as a GitHub Secret and/or `.env`, and re-run:

```
PACT_BROKER_BASE_URL=https://your-domain.pactflow.io
PACT_BROKER_TOKEN=****  # keep secret
```

</details>


---

## FAQ

<details>
<summary><strong>Is this “Pact testing”?</strong></summary>

Yes. “Pact testing” usually refers to Consumer-Driven Contract Testing (CDCT) + Provider Verification using the Pact framework and a Broker (PactFlow). This repo demonstrates that end-to-end.

</details>

<details>
<summary><strong>Do I need webhooks?</strong></summary>

Not for this demo. We use GitHub Actions to orchestrate publish → verify → can-i-deploy.  
Webhooks are optional if you want the Broker to push events (e.g., auto-trigger a verify pipeline when a new pact arrives).

</details>

<details>
<summary><strong>Why branches & versions?</strong></summary>

- **Branch** (e.g., `main`, `demo-bad`) lets you have per-branch contracts and “pending” behavior.  
- **Version** should be immutable (we use a Git SHA) so the Broker can track exactly what was tested and prevent accidental overwrites.

</details>

<details>
<summary><strong>Why do I see “Pending” on the Broker UI?</strong></summary>

A pact is pending until a provider branch publishes its first successful verification for that consumer branch.  
Pending ensures new consumer work won’t break provider builds until they’ve had a chance to implement and verify.

</details>

<details>
<summary><strong>What does <code>can-i-deploy</code> actually check?</strong></summary>

It asks the Broker: *“Given all known consumer↔provider relationships, has this version (e.g., provider SHA) been successfully verified against every required counterpart in the target environment?”*  
If any required verification is missing or failed, it returns non-zero and your deployment should stop.

</details>

<details>
<summary><strong>How do I simulate a breaking change (“bad demo”) and show it in the UI?</strong></summary>

Run the bad flow locally:

```
# Generate + publish a breaking pact on a branch
npm run demo:bad:publish

# (Optionally) verify it to show a failure from the provider perspective
npm run demo:bad:verify
```

Check the Broker UI with branch/tag filters set to `demo-bad`. You should see the failing verification and the diff in the interaction view.

</details>

<details>
<summary><strong>How do I revert to a good state after the demo?</strong></summary>

Run:

```
npm run demo:good:publish
npm run demo:good:verify
```

Then switch Broker filters back to `main`. You can leave the “bad” artifacts—branch scoping keeps them isolated for demo history.

</details>

<details>
<summary><strong>Why does the verifier log requests to a random port like <code>127.0.0.1:62xxx</code>?</strong></summary>

That is Pact’s proxy used during verification (for request/response capture and matching).  
It still forwards to your real provider base URL (e.g., `http://127.0.0.1:9010`). Seeing both is expected.

</details>

<details>
<summary><strong>My verification “hangs”. What are the usual causes?</strong></summary>

- Provider not listening on the expected port (`/health` should return quickly).  
- Corporate proxies intercepting localhost — unset `HTTP_PROXY` / `HTTPS_PROXY`, set `NO_PROXY=127.0.0.1,localhost`.  
- TLS inspection breaking Broker requests — provide `SSL_CERT_FILE` CA bundle or, for demos only, set `PACT_DISABLE_SSL_VERIFICATION=true`.  

</details>

<details>
<summary><strong>“Cannot change the content of the pact …” when publishing</strong></summary>

You published with the same consumer version as a previous run but different content.  
Publish with a new version (SHA or timestamp). Our scripts support suffixes (e.g., `CONSUMER_VERSION_SUFFIX=bad`).

</details>

<details>
<summary><strong>Why are there <em>consumer</em> and <em>provider</em> names in multiple places?</strong></summary>

Pact identifies participants by name strings (case-sensitive).  
The consumer test, provider verifier, and Broker must all use exactly the same names or the relationships won’t line up in the UI.

</details>

<details>
<summary><strong>How do “provider states” work?</strong></summary>

Each interaction can declare a state (e.g., *“User with id 123 exists”*).  
Your provider test supplies state handlers that prepare data or stubs.  
In this repo, the Node verifier wires state handlers in-process (no separate HTTP setup endpoint required).

</details>

<details>
<summary><strong>Node verifier vs. CLI verifier — which should I use?</strong></summary>

- **Node verifier** (`src/provider/verify.js`): easiest for JS projects, supports inline state handlers.  
- **CLI verifier**: language-agnostic; if you use it, expose a `/_pact/setup` endpoint or provide your own state setup script.  

</details>

<details>
<summary><strong>Why use Pact instead of OpenAPI-only tests?</strong></summary>

- **OpenAPI** describes what’s possible.  
- **Pact** asserts what is *relied upon* by real consumers.  

They complement each other: generate or validate OpenAPI for documentation; use Pact to prevent breaking changes to real integrations.

</details>

<details>
<summary><strong>How are arrays and optional fields matched?</strong></summary>

Pact matchers (e.g., `like`, `integer`, `regex`) allow shape-based matching.  
- Array order is strict unless you use specific matchers (e.g., `equals-ignore-order` in V4).  
- If a field is optional, don’t require it with a strict matcher—describe only what the consumer truly needs.  

</details>

<details>
<summary><strong>Can I test multiple consumers and providers?</strong></summary>

Yes. Each consumer publishes its pact(s). Each provider verifies those relevant to it.  
The Broker composes the matrix across all participants to determine deployability.

</details>

<details>
<summary><strong>How do tags vs. branches differ?</strong></summary>

- Historically Pact used **tags** (free-text).  
- Modern Broker features prefer **branches** for workflows (pending, WIP).  
- This repo publishes with branch and often also `tag = branch` for convenience.  

</details>

<details>
<summary><strong>Where do secrets go?</strong></summary>

Put Broker secrets (URL/token) in GitHub Actions secrets for CI and a local `.env` for demos (do not commit it).  
The pact files themselves contain no credentials—only request/response shapes and example data.  

</details>

<details>
<summary><strong>Does Pact support GraphQL?</strong></summary>

Yes. Pact supports multiple content types. This repo shows JSON HTTP, but the same principles apply to GraphQL queries/mutations as HTTP requests with JSON bodies.

</details>

<details>
<summary><strong>How do I see exactly what failed?</strong></summary>

In the Broker UI, open the interaction, then the **Diff / Mismatch view**.  
It highlights field-level differences (missing fields, type mismatches, unexpected properties, status mismatches).

</details>

<details>
<summary><strong>Why does the Broker show “work in progress (WIP)” pacts?</strong></summary>

With `--include-wip-pacts-since`, the verifier includes recent new pacts even if they don’t match your standard selectors yet—useful for early feedback on new work.  
They don’t fail the build unless configured otherwise.

</details>

<details>
<summary><strong>How do I run only provider verification locally?</strong></summary>

If a pact is already in the Broker:

```
# good path
npm run pact:verify

# bad path
npm run demo:bad:verify
```

Ensure your provider is running (or use the Node verifier which spins inline state handlers and hits your provider).

</details>

<details>
<summary><strong>How do I regenerate pacts cleanly?</strong></summary>

Use the scripts that remove `/pacts` first:

```
npm run pact:consumer
npm run pact:consumer:bad
```

They run `clean:pacts` before the tests.

</details>

<details>
<summary><strong>Do I need real databases or external dependencies?</strong></summary>

No. CDCT is about the boundary between consumer and provider.  
Use state handlers or test doubles to put the provider in the required state.  
Keep tests fast and deterministic.  

</details>

<details>
<summary><strong>Is there analytics/telemetry?</strong></summary>

The tooling may emit anonymous usage metrics. To disable, set:

```
PACT_DO_NOT_TRACK=true
```

</details>


---


