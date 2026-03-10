# Backlog: Shreyas Doshi Level Insights

Document capturing product insights, user pain points, and strategic ideas for `floo-network-message-queue-visual-lab`.

---

## User Pain Points (from Apache Iggy Discord)

| User | Use Case | Pain Point | Lab Opportunity |
|------|----------|------------|-----------------|
| kaizenmizu | Rust trading terminal, backend→client streaming | "Still exploring" - discovery friction | Visual "does it fit?" decision helper |
| alquemir | Audit trail for user CRUD actions | "CQRS is too complicated" - pattern complexity | Show ONE pattern clearly before abstraction |
| Aditya | Contributor, Rust dev | Wants to contribute, needs codebase understanding | Internals visualization as onboarding |
| Krishna Vishal | ML→Systems transition, turso contributor | "Where work is needed?" - entry point ambiguity | Codebase map with entry points |
| char8 | Potential adopter | "Just discovered Iggy today" - first touchpoint is blog | Interactive blog post (the lab itself) |
| sawan | OpenSearch user | Connector gap - no OpenSearch support | Connector coverage visualization |
| Luiz | Evaluating Iggy | Kafka compatibility FAQ | "Iggy vs Kafka: same task, different interface" |

### Insight: The "Still Exploring" Problem
Users land on Iggy and spend days "exploring" before they can make a decision. A visual lab that shows ONE complete message journey in 30 seconds accelerates the "does this fit my use case?" decision by 100x.

### Insight: Pattern Fatigue
Developers don't want CQRS, event sourcing, or CDC as abstract concepts. They want to see data flow. The lab should never say "this demonstrates CQRS" — it should show data moving and let the pattern emerge from observation.

### Insight: The Kafka Question Is the FAQ
spetz: "our fav question" — Kafka compatibility keeps coming up because users want migration safety.

The answer (no protocol compat, easy interface migration) is correct but invisible. A visual lab that shows "Same task: Iggy vs Kafka interface" answers the question in 30 seconds without docs.

### Insight: Blog Posts Are the Funnel
char8: "just discovered Iggy today... love the blogs"

First touchpoint is content, not code. The visual lab is essentially an interactive blog post. It should feel like reading a great technical essay, but with "run it yourself" buttons.

### Insight: Contributor Entry Points Are Undocumented
Krishna Vishal (top 10 turso contributor) asks "where work is needed?" and gets pointed to a specific branch with caveats: "issues are extremely vague", "code is extremely ugly".

High-quality contributors struggle to find entry points. A visual map of "start here, go here, here's what this module does" would accelerate contribution velocity.

### Insight: Connector Coverage Gaps Are Visible to Newcomers
sawan (first day) immediately noticed OpenSearch gap.

Newcomers see gaps faster than maintainers because they arrive with fresh context from other ecosystems. The lab could surface "connector coverage map" as a contributor recruitment tool.

### Insight: Language Wrapper Maintenance Is the Hidden Tax
Luiz: "One challenge on having many language wrappers is maintaining it."

Every SDK is a liability. Iggy's approach (build own SDKs with community help) is necessary but costly. The lab should show SDK usage patterns, reducing support burden by being the canonical "how to use Iggy" reference.

### Insight: Architecture in Flux Is an Opportunity
Iggy is mid-migration: tokio → compio, thread-per-core architecture like Scylla/Redpanda.

This creates:
- Pain: docs are outdated, code is "extremely ugly"
- Opportunity: contributors who learn it now will understand the new architecture before anyone else

The visual lab can document the migration itself — "before and after" architecture comparison.

---

## Strategic Insights

### Insight: Adopters First, Contributors Second
The primary user is the engineer evaluating Iggy for their use case. Contributors are a side benefit.

If the visualization helps someone decide "Iggy fits my trading terminal" (kaizenmizu), that's the win. If it happens to also help a contributor understand the codebase, that's bonus — not the goal.

**Shreyas Doshi principle:** Solve the user's problem, not the contributor's problem. Contributors are users of the codebase. Adopters are users of the product.

### Insight: Nobody Owns "Explainer" Position in Rust MQ Space
In Apache Iggy ecosystem:
- Core contributors understand internals deeply
- Users just want connectors working
- **Gap: No one makes internals accessible visually**

This is a defensible niche. Not "most PRs" but "best explainer."

### Insight: Visualization Forces Understanding
You cannot build a message journey tracer without understanding:
- Partition assignment code
- Segment storage format
- Index structure
- Consumer offset management
- Transport layers (TCP/QUIC)

The project is a learning vehicle disguised as a teaching tool.

---

## Product Ideas

### P1: Message Journey Tracer (Core Innovation)
A Rust tool that instruments Iggy to emit trace events:

```
t=0ms    Producer sends (2KB payload)
t=2ms    Server receives → stream:orders, topic:new
t=3ms    Assigned to partition 3
t=4ms    Appended to segment file (offset: 10,042)
t=4ms    Index updated
t=15ms   Consumer "checkout-service" polls
t=16ms   Offset committed to disk
```

**Why this matters:** You can't fake this. Building it forces deep codebase understanding.

### P2: Side-by-Side Broker Comparison
Same message, different brokers, rendered in parallel:

| Iggy | Kafka |
|------|-------|
| QUIC transport | TCP |
| io_uring I/O | epoll |
| Single binary | Zookeeper + brokers |

**Why this matters:** "Why Iggy over Kafka?" is the #1 question. Answer visually, not with docs.

### P3: Failure Mode Visualization
What happens when:
- Consumer dies mid-poll?
- Partition rebalance occurs?
- Backpressure builds?

**Why this matters:** Production debugging. Users don't understand failure modes until they see them.

### P4: Connector Journey Visualization
Postgres CDC → Iggy → Sink

Show the full connector path, not just broker internals.

**Why this matters:** Connectors are how real users interact with MQs. Pure broker visualization is academic; connector visualization is practical.

### P5: Interview Prep Mode
"Explain what happens when a producer sends a message" — common interview question. Lab becomes study tool.

**Why this matters:** Distributes the project through interview prep channels, not just MQ communities.

### P6: Kafka Migration Guide (Interactive)
Show the same task (produce, consume, offset commit) in Iggy vs Kafka side by side.

**Why this matters:** This is the #1 FAQ. Answer it visually. "Iggy doesn't support Kafka protocol, but here's what migration looks like."

### P7: Connector Coverage Map
Visualize which connectors exist, which are in progress, which are gaps.

**Why this matters:** sawan noticed OpenSearch gap immediately. Surface this for contributors.

---

## Content Ideas (Fieldbook Chapters)

### Ch1: Fundamentals
- What is a partition (visualized)
- Append-only log (animated)
- Consumer offsets (interactive)

### Ch2: Iggy Internals
- Message journey (the core)
- Partition storage format
- io_uring explained (why it matters)
- QUIC vs TCP (transport decision)

### Ch3: Kafka Comparison
- Architecture differences (side by side)
- When to use which (decision tree)

### Ch4: Interactive Labs
- Lab: Backpressure
- Lab: Replay
- Lab: Partition Rebalance

---

## Naming Insights

### Current: `floo-network-message-queue-visual-lab`

**Pros:** Harry Potter theme, "lab" suggests experimentation
**Cons:** Long, doesn't convey "fieldbook" or "guide" aspect

### Alternatives:
- **Message Queue Fieldbook** (like a naturalist's field guide)
- **MQ Observatory** (watching things happen)
- **Iggy Explorer** (tool-specific, narrower)

### Insight: Name Should Promise Transformation
Not "learn about message queues" but "see what you couldn't see before."

---

## Open Questions for Future Insights

1. Should v0.1 trace Source→Iggy or Iggy→Sink? (Different learning stories)
2. CDC vs polling for Postgres connector? (Complexity tradeoff)
3. Connector-only events vs connector + storage events? (Scope boundary)
4. Should the lab be embeddable in Iggy docs? (Partnership opportunity)

---

## Meta: What Makes an Insight "Shreyas Doshi Level"?

1. **Counterintuitive** — goes against common wisdom
2. **Simply stated** — one sentence, no jargon
3. **Deeply true** — reveals something fundamental
4. **Actionable** — changes what you build or how

Add to this document when you find them.

---

*Last updated: 2026-03-10*
