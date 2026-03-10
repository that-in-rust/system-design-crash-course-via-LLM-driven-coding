# Codex Reference

## Project Working Defaults

- Prefer `gh` CLI for GitHub work.
- Keep upstream reference repositories under `_ref/`.
- Treat `_ref/iggy` as the local read-only reference copy of Apache Iggy.
- Keep `v0.1` narrow: one broker, one message, one trace, one visualization.
- Prefer a production-relevant connector story over a purely synthetic demo story.

## GH CLI First

Use `gh` as much as possible for:

- cloning upstream repos
- searching issues and pull requests
- opening PRs and issue pages
- querying GitHub API data
- checking file context tied to GitHub discussions

Preferred commands:

```bash
gh repo clone apache/iggy _ref/iggy
gh search issues --repo apache/iggy --match title "postgres connector"
gh search prs --repo apache/iggy --match title "postgres source"
gh api repos/apache/iggy/pulls
gh browse
```

## Connector Selection Guidance

Until a better choice is documented, assume this priority order for `v0.1` research:

1. PostgreSQL connector path
2. MongoDB connector path
3. Elasticsearch connector path

Use `random_source` and `stdout_sink` only as scaffolding if we need a fast trace harness before the production-relevant story is ready.
