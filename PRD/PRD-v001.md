# PRD v001

Status: Draft  
Date: 2026-03-10

## Product Statement

`floo-network-message-queue-visual-lab` will start as a narrow teaching tool:

- one broker
- one message
- one trace
- one visualization

The goal of `v0.1` is not breadth. The goal is to make one real message path inside Apache Iggy visible enough that a contributor can understand what happened and why.

## Current Direction

- The backend must be implemented in Rust.
- The first connector-backed story should use a more popular, production-relevant connector, not only a demo connector.
- GitHub research and upstream inspection should use `gh` CLI as the default workflow.
- The local upstream reference repo lives in `_ref/iggy`.

## Executable Requirements

### REQ-ARCH-001.0: Rust Backend Required

**WHEN** backend services, tracing hooks, or message-flow orchestration are implemented  
**THEN** the system SHALL use Rust as the backend language  
**AND** SHALL keep non-Rust code limited to frontend presentation concerns  
**SHALL** avoid introducing a second primary backend runtime for `v0.1`

### REQ-CON-001.0: Popular Connector First

**WHEN** selecting the first connector-backed scenario for `v0.1`  
**THEN** the system SHALL prefer an existing Apache Iggy connector tied to a widely used external system  
**AND** SHALL prefer a connector that already has upstream code, documentation, and integration coverage in `apache/iggy`  
**SHALL** treat purely debug-oriented connectors such as `random_source` and `stdout_sink` as scaffolding or fallback paths, not the preferred public-facing story

### REQ-WKF-001.0: GH CLI As Default GitHub Workflow

**WHEN** inspecting upstream repositories, pull requests, issues, file history, or release context  
**THEN** contributors SHALL use `gh` CLI as the default interface  
**AND** SHALL prefer `gh repo clone`, `gh search prs`, `gh search issues`, `gh api`, and `gh browse` before manual browser work  
**SHALL** fall back to manual browser-only exploration only when `gh` cannot answer the question cleanly

## Initial Connector Recommendation

Current preferred direction: PostgreSQL connector path.

Why this is the leading candidate:

- PostgreSQL is more broadly relevant than debug/demo connectors.
- It matches the larger story around CDC and real data movement.
- Apache Iggy already includes upstream PostgreSQL source and sink connectors.
- It creates a better bridge between "visual lab" and "real systems behavior" than synthetic generators.

Fallback path if setup complexity blocks progress:

- use `random_source` plus `stdout_sink` only to prove the trace pipeline and visualization mechanics
- do not present that fallback as the long-term public narrative for the project

## Test Matrix

| req_id | test_id | type | assertion | target |
| --- | --- | --- | --- | --- |
| REQ-ARCH-001.0 | TEST-ARCH-001 | repo review | Backend implementation paths use Rust crates and Cargo as primary backend tooling. | v0.1 repo structure |
| REQ-CON-001.0 | TEST-CON-001 | reference review | Selected connector exists upstream and has code plus docs in `_ref/iggy`. | connector choice |
| REQ-CON-001.0 | TEST-CON-002 | scope review | Demo-only connectors are not the primary public v0.1 story unless explicitly marked as scaffolding. | PRD and README |
| REQ-WKF-001.0 | TEST-WKF-001 | workflow review | GitHub inspection steps in project notes use `gh` commands first. | contributor workflow |

## TDD Plan

### STUB

- Create the repo-level product constraints in writing.
- Identify the exact connector path to trace first.
- Define the first message journey as a fixed scenario.

### RED

- Attempt to describe the full message journey and note what cannot yet be explained from the code.
- Attempt to map the chosen connector to the exact server and storage modules involved.

### GREEN

- Build a minimal Rust backend that can emit one trace for one message journey.
- Render that trace in one browser visualization.

### REFACTOR

- Simplify naming, event schema, and UI framing after the first trace is working.
- Remove any connector-specific complexity that is not necessary for the first public demo.

### VERIFY

- Confirm the backend remains Rust-first.
- Confirm the connector story is production-relevant.
- Confirm the workflow notes still point contributors to `gh` CLI first.

## Quality Gates

- No claim of "popular" or "production-relevant" should appear without naming the chosen connector explicitly.
- No second broker should be added to `v0.1`.
- No second visualization mode should be added to `v0.1`.
- No backend implementation plan should drift away from Rust.
- Each future PRD revision should either preserve or intentionally supersede these three requirements.

## Open Questions

- Should `v0.1` trace PostgreSQL Source -> Iggy, or Iggy -> PostgreSQL Sink?
- Do we want the first public demo to show CDC specifically, or a simpler polling-based PostgreSQL flow?
- Should the visualization show only connector/runtime events first, or also storage-layer events from inside the Iggy server?
