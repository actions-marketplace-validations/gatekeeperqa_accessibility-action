# GatekeeperQA Accessibility Evidence

Run the published GatekeeperQA CLI 0.3.0 in GitHub Actions. Save JSON, Markdown, HTML and JUnit evidence before enforcing a quality gate. Automated checks support human review; they do not certify WCAG conformance.

## Quick start

Supported: GitHub-hosted Ubuntu with Node 24. Check out your project, start your application, wait for its health check, then run this action. Create `gatekeeperqa.json`:

```json
{"urls":["http://127.0.0.1:3000/"],"failOn":["serious","critical"],"warnOn":["minor","moderate","unknown"]}
```

```yaml
permissions:
  contents: read
jobs:
  accessibility:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          persist-credentials: false
      # Install/start your application and wait for readiness here.
      - uses: gatekeeperqa/accessibility-action@v1.0.0
        with:
          config: gatekeeperqa.json
          artifact-name: accessibility-reports
```

Prefer pinning the reviewed release commit SHA instead of a movable tag. See Releases for available versions.

## Results and limits

- PASS/WARN: exit-code output 0; gate succeeds.
- FAIL: exit-code 1; gate fails after uploading evidence. The CLI also classifies unreachable targets as FAIL with diagnostic report data.
- ERROR: exit-code 2; invalid configuration or adapter execution error. Setup failure also fails the job, but can produce no artifact or outputs.
- Outputs: `status` and `exit-code`. Reports are retained for seven days. Use distinct artifact names for multiple invocations.
- Each invocation creates a new report directory; old passing reports are not reused.

CLI execution does not consume hosted scanner credits. For hosted reports and human-review workflows, visit [GatekeeperQA](https://gatekeeperqa.com/).

## Security and privacy

Only scan sites you own or have permission to test. Use `pull_request`, not privileged `pull_request_target`, for untrusted PR code. No write token or GatekeeperQA account is required. Do not pass secrets to untrusted PR jobs or use privileged self-hosted runners. Reports may contain URLs, selectors and page content: review targets and artifact access. The Action does not post PR comments. Branch protection must be configured separately to block merges.

Dependencies are locked in package-lock.json, install scripts disabled, and third-party Actions pinned by SHA. Chromium installation still downloads the matching browser. The hosted application source is not included.

## Development

Use Node 24: `npm ci --ignore-scripts`, `node node_modules/playwright/cli.js install chromium`, `npm test`. Tests use local fixture pages, not third-party websites. MIT license covers this adapter; dependencies retain their respective licenses.
