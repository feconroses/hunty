# Roadmap

A living list of what I'm thinking about for Hunty. **Plans, not promises** — order changes as I learn from people using it.

For anything you'd like to vote on, propose, or pick up, open a thread in [Discussions](https://github.com/feconroses/hunty/discussions).

## Now

In progress or actively being designed:

- **v1 launch polish** — bug fixes, design tightening, edge cases in the kanban and Tasks flow surfaced by early users.
- **Better duplicate detection** — improving the Check URL flow so partial URL changes (UTM params, redirects, query string differences) don't cause re-saves.

## Next

Top of mind for the next few months:

- **Hunty Chrome extension** — a first-party browser extension so Hunty runs *without* a Claude subscription. Claude in Chrome is great for power users, but locking automation behind a paid plan limits who can self-host. A native Hunty extension would handle the same scanning workflows (careers pages, LinkedIn) using deterministic logic instead of an LLM. **This is the biggest open contribution opportunity** — open a thread in [Discussions](https://github.com/feconroses/hunty/discussions) if you want to take it on or help scope it.
- **Application reminders** — proactive nudges when an application has been sitting in a stage too long.
- **Bulk import** — upload a CSV of companies or paste a list and queue scans for all of them.
- **Better LinkedIn coverage** — handle more filter combinations, broader location handling, and edge cases in pagination.
- **Tests** — add a Playwright/E2E setup on the frontend and broader pytest coverage on the backend.

## Later

Bigger ideas, lower confidence:

- **More job sources** — Wellfound, RemoteOK, Otta, plus company-specific ATS integrations (Greenhouse, Lever, Ashby).
- **Resume tailoring** — Claude help drafting a tailored resume or cover letter for each saved job from your stored profile.
- **Extension-only mode** — pair the Hunty extension with a local-only datastore (no backend), for users who want zero infrastructure.
- **Multi-user / team mode** — Hunty for recruiting teams or job-search groups (still self-hosted, still privacy-respecting).
- **Public hosted offering** — only if it makes sense for the community; for now Hunty is self-hosted-first.

---

If something here matters to you, drop a thumbs-up on the corresponding [Discussions](https://github.com/feconroses/hunty/discussions) thread (or open one). The order is influenced by what people actually want.
