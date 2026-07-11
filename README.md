# @zosmaai/gacli

Google Analytics 4 CLI — Data API + Admin API, OAuth auth, multiple output formats, MCP server.

## Install

```bash
npm install -g @zosmaai/gacli
```

## Quick Start

```bash
# Authenticate (OAuth 2.0)
gacli auth login --client-secret /path/to/client_secret_*.json

# List accounts
gacli admin accounts list

# List properties for an account
gacli admin properties list --account <account_id>

# Run a report
gacli report run --property 537354123 --dimensions date --metrics activeUsers --date-range 2025-06-01 2025-07-01
```

## Common Commands

```bash
# Admin API
gacli admin accounts list
gacli admin properties list --account <account_id>
gacli admin properties data-governance --property <property_id>

# Data API
gacli report run --property <id> --dimensions date --metrics activeUsers
gacli report run --property <id> --dimensions pageTitle --metrics screenPageViews --date-range 28daysAgo today

# Check metadata compatibility
gacli metadata compatibility --property <id>
```

## Output Formats

```bash
gacli admin accounts list -f json
gacli admin accounts list -f csv
gacli admin accounts list -f table
```

## Release

Tag and push to trigger npm publish:

```bash
git tag v1.x.x && git push origin v1.x.x
```

## Links

- Repo: https://github.com/zosmaai/gacli
- npm: https://www.npmjs.com/package/@zosmaai/gacli