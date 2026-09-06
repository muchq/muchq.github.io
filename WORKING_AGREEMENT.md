# Working agreement

How work gets picked up, built, reviewed, and shipped in this repo. Written
down so a future session starts where the last one left off instead of
rediscovering the same conventions.

This is process, not architecture. Architecture lives in
[README.md](README.md) and the wire contracts, which are the games_hub smithy
models in MoonBase (`domains/games/apis/games_hub/model/`) for golf and thoughts.

Adapted from the MoonBase working agreement
([`MoonBase/docs/WORKING_AGREEMENT.md`](https://github.com/muchq/MoonBase/blob/main/docs/WORKING_AGREEMENT.md)),
itself adapted from smithy-cpp, with the same rule applied: where a convention
there has no analogue in this repo it has been dropped rather than restated
aspirationally, and where the tooling differs the command named is this
repo's. The worked examples and receipts behind the shared rules live in the
MoonBase copy; this one keeps the rules.

## Shipping a change

**One item, one PR.** Take the highest-value open item, finish it, ship it,
then take the next. Don't batch unrelated fixes. A dependency bump and a
feature do not belong in the same PR.

**Altitude review first.** Before writing any code: read the cited code,
confirm the finding is actually real, and propose a plan. Only then implement.
Jumping straight to a fix hides the cases where the reported issue is a
symptom of something bigger.

**Ask about scope when the sizes differ materially.** If the plan has a
minimal version and a thorough version that lead to genuinely different work,
ask — with a recommendation, not a survey. If they only differ cosmetically,
pick the obvious one and say so.

**Question the request itself, not just how to build it.** Before
implementing, step back once and ask: is this feature a good idea? Is there
another approach that dissolves the problem instead of managing it? A request
describes a symptom the reporter noticed; it is not automatically the best
response to that symptom, and the person asking usually hasn't seen the
constraint you're about to read in the code. Raise the alternative in a
sentence or two, give a recommendation, and proceed — don't stall. If the
alternative turns out to be the better design, that is a much cheaper
discovery before the code exists than after.

**Don't open a PR unless asked.** Commit and push when the work is done; open
the PR only on request. Reference the tracking issue and, when the issue is a
checklist, tick the item once merged.

**Update the tracking issue.** Fold new data — reproductions, measurements,
scope corrections — back into the issue so it stays the source of truth. File
follow-ups for what you deliberately left out rather than leaving it implicit.

## Review panel

Before committing anything non-trivial, run a self-review panel:

- **Four independent agents, four distinct lenses.** For this repo that is
  typically React correctness (hooks, state, effects, renders); CSS/UX and
  accessibility; game-flow and wire/adapter integration; and tests and CI
  gates. The lenses should barely overlap.
- **The altitude lens re-asks the pre-code question of the finished diff.**
  Is this change at the right level, or a patch over a symptom of something
  bigger? Does each new abstraction earn its keep, and would less code do
  (see Design and simplification)? The other lenses stare at what the diff
  does; this one asks whether it should exist in this shape at all — the
  review most likely to be skipped, precisely because nothing is "wrong."
- **Panel agents read; they never write.** No edits, no scratch mutations, no
  "revert it and see what happens" — not even a change the agent fully
  intends to undo. The panel runs several agents at once over the same files,
  so one agent's scratch mutation is another's mystery failure; an agent that
  dies mid-run leaves deliberately-broken code in the tree; and a dirty tree
  invites a commit that ships the mutation. An agent that wants to know
  whether a test bites reports that as a finding instead of finding out.
- **Enforce read-only structurally, not by instruction.** Convene panels on an
  agent type without edit or write tools, and keep write-shaped questions out
  of the briefs — "verify this test fails on the old code" is an instruction
  to mutate the tree no matter how firmly the same brief says never to.
- **Each agent hunts, then tries to refute its own findings** before
  reporting. This is what keeps the signal-to-noise usable.
- **Verify the survivors yourself** before acting on them. Agents are
  sometimes confidently wrong; don't take a finding at face value.
- **Aggregation is where the writing happens.** Every surviving finding not
  already covered gets a test — positive *and* negative — including the
  findings you decide *not* to act on, where the test pins the behavior you
  chose to keep so the next reader doesn't reopen the question. Proving that
  a negative test bites (see the testing bar) belongs here too: it needs a
  clean tree and a single writer.

**If the panel didn't run, say so.** A restart, an interrupt, or simply
forgetting can kill it. Report that plainly rather than letting the reader
assume the step happened.

**Answer review questions with tests, not paragraphs.** See the testing bar —
this is the single highest-leverage rule in this document.

**Look for simplification on every review.** A review that only hunts for
defects is doing half the job.

## Design and simplification

**The goal is simple, readable code with clear interfaces.** Not clever code,
not maximally general code — code the next reader understands without a tour.
An interface that takes a paragraph to explain is a design problem wearing a
documentation problem's clothes; fix the interface.

**Testability is a core requirement, not a side effect.** If something is hard
to test, that is a design defect, and the design is what changes — never
settle for testing it badly, testing it indirectly, or not at all. The seams
that let a test drive the behavior (an injectable clock, an adapter interface,
a callable policy) are part of the deliverable, not scaffolding bolted on
afterward.

**Every review is a simplification opportunity.** Does this abstraction earn
its keep? Can two near-identical paths become one? Is this special case
actually special? Can this be deleted outright? The best review outcome is
often less code, not more.

**Characterize before you refactor — positive *and* negative tests, first.**
Before changing the shape of existing code, cover it with tests that pin both
what it does and what it *refuses* to do, and confirm they pass against the
unchanged code. Only then refactor.

The ordering is the whole point. Tests written afterward describe the new
code's behavior, not the behavior you meant to preserve — that is how a
refactor silently becomes a rewrite. And the negative half is not optional:
positive tests alone let a refactor quietly *widen* behavior, accepting input
the original rejected, which is exactly the shape of a security regression.

## Testing bar

**A test beats an argument.** If a behavior is interesting enough to question,
debate, or reason carefully about — in a review, in a PR thread, or in your
own head — write a test that runs in CI instead. Reasoning is invisible to the
next reader, decays as the code moves underneath it, and is exactly what the
person who wrote the bug already did. A test is executable, survives
refactors, and fails at the moment the property breaks rather than the moment
someone notices.

In practice: when a reviewer asks "what happens if X?", the deliverable is a
CI test named after X — not a reply explaining why X is fine.

**Comments are not a contract. CI tests are.** A doc comment stating a rule
constrains nothing. It is intent, and intent that nothing enforces drifts from
the code the moment someone edits without reading it — silently, with no
failure anywhere. If a property matters, something must *fail* when it is
violated: a test, a type, or a fail-fast check that a test then pins. Keep
writing comments — they carry the *why*, which no test can — but the comment
documents the contract; it is never the contract itself.

**The Beyoncé Rule: if you liked it, you should have put a test on it.** Every
observable behavior worth keeping gets a test, at every level that fits:

- **unit** — the mechanism itself: utils, adapters, permalink parsing;
- **component** — the behavior through the real component or hook with
  Testing Library under jsdom (`src/test/setup.ts` carries the shared shims);
- **the consumer's boundary** — this repo is itself a consumer: the golf and
  thoughts backends live in MoonBase, and their smithy models (games_hub's
  `golf.smithy` and `thoughts.smithy`) are the contracts. Prove wire
  behavior by feeding raw JSON frames to the real stream (as
  `src/utils/__tests__/hubStream.test.ts` does), not through helpers
  that mirror the client's own assumptions back at it.

An untested observable behavior is not a guarantee; it is a coincidence that
currently holds.

**Test through the same objects production uses.** A test that hand-builds its
own copy of a mapping is testing the copy it built. Drive the real adapter,
the real hook, the real component — and when a test must mock a seam (a
component test mocking its hook), keep the mock's shape typed against the real
return type so drift fails the typecheck instead of silently passing.

**TDD for bug fixes.** Write the failing test first, watch it fail for the
right reason, then fix it.

**Prove that negative tests bite.** A test asserting that something is
*rejected* or *absent* must be proven to fail when the property it pins is
broken. There is no mutation-check script in this repo: break the code by
hand, watch the test go red, revert — on a clean tree, before committing,
never while a review panel is running. Mutate the *behavior*, not the syntax —
a change that fails to compile says nothing about the tests.

**Prove isolation with a control.** When a test asserts an absence or a
failure, add the positive twin that shares the fixture, so a broken fixture
can't masquerade as the property holding.

**Re-run timing-sensitive tests.** Anything with fake timers, sockets, or
scheduling gets a few repeated local runs before it's trusted; vitest has no
repeat flag, so loop `npm run test:run <file>` a handful of times.

## Verification before pushing

Run these, and don't report success on a step that didn't run.

| Step | Command | Gated in CI? |
|---|---|---|
| Type check | `npm run typecheck` | yes — `test` job |
| Lint (zero-warning budget) | `npm run lint` | yes — `test` job |
| Tests | `npm run test:run` | yes — `test` job |
| Production build | `npm run build` | yes — `test` job |
| Deploy preview | automatic — Cloudflare Workers Builds | yes — posts per-commit and per-branch preview URLs on the PR |

There is no formatting gate: no prettier, no format script — eslint's
zero-warning budget is the only style enforcement in CI. Don't claim
otherwise.

CI (`.github/workflows/ci.yml`) runs on pull requests against `main` only; a
push to a branch with no open PR runs nothing but the Cloudflare build.

**Run the app, not just its tests.** `npm run dev` serves everything static;
the multiplayer apps (golf, thoughts) and the metrics dashboards need a live
backend — `npm run local-server` points them at one on `:2015`, and MoonBase
is where that backend lives. When a flow genuinely can't be exercised locally
(a multiplayer phase that needs a server to drive it), say so in the PR body
and verify what you can: component tests plus loading the Cloudflare branch
preview. Chromium and Playwright are available in the sandbox.

## Docs

- Update docs in the same PR as the code: [README.md](README.md), and the
  header comments of the wire clients (`src/utils/hubStream.ts`,
  `src/utils/networkSystem.ts`) that read the games_hub models in MoonBase.
- **When behavior changes, fix the doc that describes it in the same commit.**
  A doc left contradicting the code is a defect in its own right.
- The games_hub smithy models describe contracts the MoonBase server
  speaks; when either side of the wire changes, the client's reading of the
  model moves with it — or says explicitly which side is ahead.
- Keep the claims accurate. Don't write that something is covered
  "everywhere" when a subtree is deliberately excluded; name the exclusion.
- There are no ADRs and no CHANGELOG. The nearest equivalents are the docs
  above and the PR body; put the *why* in one of them rather than nowhere.

## Dependencies and infrastructure

**Re-check assumed limitations instead of repeating them.** A limitation
recorded in a previous session may no longer hold.

**When you find a workaround, make it reusable.** Document it (README or this
file) and script it where possible, so the next session gets it for free.

**Dependency bumps: don't trust the PR's own green CI.** Check how stale its
base is — checks that passed against an old base validated a tree that no
longer exists. Merge into current `main` locally and run the checks. For a
security-sensitive dependency, also ask what the existing tests actually
*assert*.

**A bump that clears an advisory may need more than the version number.** Read
the advisory's affected range against the versions actually available rather
than taking a proposed in-range bump at face value; sometimes the real fix is
a major migration.

**Bumps have fallout beyond compilation.** This is a Cloudflare Workers app
(`wrangler.json`): toolchain bumps can require configuration changes — a
`compatibility_date` raise, a wrangler setting — that `npm run build` alone
will never surface, and CI only runs the build. Run the app, not just its
tests.

## Communication

- Raise a concern in a sentence or two, then proceed with the work. Don't stop
  and wait unless proceeding would be unsafe or wasted.
- Report outcomes faithfully: if a step was skipped, say it; if tests failed,
  show it.
- Distinguish real defects from nits when reviewing, and say which is which.
- Don't re-litigate decisions already made.

## Operational notes

- **Verify user-facing URLs by loading them.** The site is served by
  Cloudflare at [muchq.com](https://muchq.com); Cloudflare's default
  `html_handling` redirects paths like `/index` when `index.html` exists, and
  no amount of reading the router will show that. Load the URL.
- **Squash merges, linear history.** PRs are squash-merged and the remote
  branch is then deleted, so a stale local `origin/<branch>` ref makes a
  `--force-with-lease` push fail with "stale info". `git remote prune origin`
  and push fresh; don't force. After a merge, restart the working branch from
  current `main` rather than stacking on the merged history.
- **Wedged PRs.** Before believing a phantom conflict on an open PR, check
  whether the PR head is already an ancestor of `origin/main` — the owner
  sometimes merges locally and pushes `main` directly. A push to the branch
  un-wedges it.
