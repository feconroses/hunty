<div align="center">

# Hunty

**The open-source job-hunt copilot — your applications and pipeline, on your machine.**

[Quick start](#quick-start) · [How it works](#how-it-works) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md) · [Discussions](https://github.com/feconroses/hunty/discussions)

[![License: MIT](https://img.shields.io/badge/License-MIT-1db954.svg)](./LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/feconroses/hunty)](https://github.com/feconroses/hunty/commits/main)
[![Discussions](https://img.shields.io/github/discussions/feconroses/hunty)](https://github.com/feconroses/hunty/discussions)

<!--
DEMO GIF PLACEHOLDER:
- Record a 600-800px wide, 8-20s clip showing Claude scanning a LinkedIn search and adding jobs to the kanban.
- Tools: Kap (free), ScreenStudio, CleanShot X. Aim for <5MB.
- To host: drag-drop the file into a draft GitHub issue, copy the resulting `https://user-images.githubusercontent.com/...` URL, then replace this comment with: ![Hunty demo](URL)
-->

</div>

Hunty is a self-hosted job search and application tracking tool. You tell it which companies you'd want to work at and the filters that matter to you (skills, seniority, work type, salary). Claude — running in your browser via the [Claude in Chrome](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) extension — does the rest: visits careers pages, paginates through LinkedIn searches, evaluates each posting against your filters, deduplicates, and drops the matches into a kanban board you can move through your application pipeline.

- **Self-hosted.** Your filters, jobs, and application history never leave your machine.
- **No API keys.** Hunty has no internal LLM. AI work is delegated to Claude in your own browser.
- **Two monitoring strategies.** Track specific target companies *and* run saved LinkedIn searches — both feed the same board.
- **Resumable scans.** Claude skips jobs you've already saved and picks up exactly where it left off.
- **Built to extend.** A [Hunty Chrome extension](./ROADMAP.md) is on the roadmap so you'll be able to run Hunty without a Claude subscription.

## Quick start

Get running in under 2 minutes:

```bash
git clone https://github.com/feconroses/hunty.git
cd hunty
cp .env.example .env
# at minimum, set JWT_SECRET_KEY (generate with: openssl rand -hex 32)
docker-compose up
```

Open http://localhost:3000 — that's it. Docker brings up Postgres, runs migrations, and starts the backend (FastAPI on `:8000`) and frontend (Next.js on `:3000`) with hot reload.

Sign up, add a target company or LinkedIn search, define your filters, then head to `/tasks` in Chrome with the [Claude in Chrome](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) extension installed — copy the prompt and hand it to Claude.

For manual setup or contributing changes, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why I built Hunty

I didn't build Hunty for me. I built it for two friends and a family member who were grinding through a job search and getting drained by what should be the smallest part of it.

Here's what I kept watching them do: scroll LinkedIn for hours, open ten company careers pages in tabs, read job description after job description — most of them noise (wrong seniority, wrong stack, wrong location, wrong comp). Out of every hundred postings, maybe five were worth applying to. That filtering work is roughly 80% of the time and effort of a job search, and it's the part that *least* matters. Job hunting should be about nailing the interviews, preparing thoroughly, articulating why you're a good fit, and figuring out whether the company is right for you — not being a human duplicate-detector at 11pm on a Wednesday.

So I built Hunty. You define your filters once, let Claude do the combing, and the matches land in your kanban — ready for the work that actually matters.

It's early. It works for the people I built it for. I'd love to make it work for you too — say hi in [Discussions](https://github.com/feconroses/hunty/discussions).

— Feco

## How it works

1. **Define your sources.** Add target companies you'd like to work at, and/or save LinkedIn searches with the filters you'd normally apply.
2. **Define your filters.** Build AND/OR rules over skill keywords, seniority levels, work type, salary range, and language requirements.
3. **Hunty queues tasks.** Each source is matched to a task type (`find careers page`, `scan careers page`, or `scan LinkedIn`) with structured instructions for Claude.
4. **Hand off to Claude in Chrome.** Open the Tasks page, copy the prompt, send it to Claude.
5. **Track and apply.** Matched jobs land in your Jobs kanban. Move them through your application stages, take notes, let the activity log keep an audit trail.

## Two ways to monitor jobs

Hunty supports two complementary monitoring strategies. Use either or both — they feed the same kanban and use the same filters.

### 1. Target Companies → Careers Pages

For specific companies you want to work at:

- **Add a company** with its name and homepage URL.
- Hunty creates a **find careers page** task — Claude visits the homepage and saves the careers/jobs page URL back to Hunty.
- Hunty then creates **scan careers page** tasks — Claude opens the page, walks each posting, deduplicates, evaluates against your filters, and saves matches.

**Best for:** dream-company lists, employer-driven search, smaller startups whose listings rarely show up on LinkedIn.

### 2. LinkedIn Searches

For broad coverage across the market:

- **Define a saved search** with keywords, location, posting recency (always past 24 hours), experience level, workplace type, employment type, and other LinkedIn filters.
- Hunty constructs the LinkedIn search URL programmatically.
- Hunty creates a **scan LinkedIn** task — Claude opens the search URL, paginates through every result page (LinkedIn often shows "99+ results" — Claude keeps clicking *Next* until there's none), deduplicates, evaluates against your filters, and saves matches.

**Best for:** broad-net searches across many companies, role-driven search, surfacing companies you didn't already know about.

## How Claude in Chrome fits in

Hunty's automation engine isn't an internal LLM — it's **Claude in Chrome**, the browser extension that lets Claude read and interact with web pages directly. Hunty's role is to:

- Decide what tasks to run and in what order.
- Generate the precise instructions Claude needs.
- Provide a UI Claude can read from and submit results into.

The Tasks page (`/tasks`) is the handoff surface. It has three queues — **Today**, **Queue**, and **Scheduled** — and a **Claude Instructions** panel that produces the exact prompt to feed Claude.

There are two run modes:

- **Claude Cowork** — for when Claude controls Chrome from outside (e.g., the Claude desktop app driving the browser). The prompt includes a setup preamble.
- **Chrome Extension** — for when you're already on `/tasks` in Chrome with the Claude in Chrome extension active. The prompt skips setup.

For each task, Claude reads the card, opens the relevant external page in a new tab, walks listings one at a time, deduplicates against Hunty's database via a **Check URL** input *before* opening any job description, evaluates against your filter rules, saves matches with structured fields (title, location, salary, skills, language, summary), and marks the task complete. Tasks are resumable — Claude sees green "Saved" badges for jobs already added and skips ahead.

## Features

- **Target Companies** — manage the list of companies you want to track.
- **LinkedIn Searches** — saved searches with structured filters; URLs constructed programmatically.
- **Jobs Kanban** — drag-and-drop board with custom stages.
- **Tasks** — three queues (Today, Queue, Scheduled) with type-specific Claude instructions.
- **Filters** — AND/OR rules over skill keywords, seniority, work type, salary range, language requirements.
- **Activity Log** — audit trail of every change.
- **Settings & Profile** — account, password, email verification.

## Configuration

Set in `.env` at the repo root (see `.env.example`):

| Variable | Description |
|---|---|
| `JWT_SECRET_KEY` | Secret used to sign access/refresh tokens. **Required.** Generate with `openssl rand -hex 32`. |
| `RESEND_API_KEY` | Resend API key for transactional email (verification, password reset). Optional — leave blank to skip email features. |
| `RESEND_FROM_EMAIL` | Sender address for outgoing email. Defaults to `noreply@hunty.app`. |
| `CORS_ORIGINS` | JSON array of allowed origins. Defaults to `["http://localhost:3000"]`. |

The backend reads `DATABASE_URL` and `DATABASE_URL_SYNC` automatically when running via Docker Compose. For manual setup see `backend/.env.example`.

## Roadmap

The big bet: a **Hunty Chrome extension** that handles the scanning workflows directly, so Hunty runs without a Claude subscription. Plus everything else on the way.

See **[ROADMAP.md](./ROADMAP.md)** for what's planned. Open a thread in **[Discussions](https://github.com/feconroses/hunty/discussions)** to vote on what's next or pitch your own.

## Contributing

Hunty is early and looking for contributors. Bug reports, feature ideas, and pull requests are all welcome — the planned Chrome extension alone is a great place to start.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for dev setup, project layout, and PR conventions. New here? Open a thread in **[Discussions](https://github.com/feconroses/hunty/discussions)** and say hi.

## Tech stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · @dnd-kit
- **Backend:** FastAPI · SQLModel · PostgreSQL 16 · Alembic
- **Auth:** JWT (access in memory, refresh in httpOnly cookie) · Resend for email
- **AI:** Claude in Chrome browser extension

## Built with

Hunty is the front-end and the glue. The hard parts are owed to:

- **[Claude in Chrome](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)** — the browser-automation Claude that does the real work
- **[Next.js](https://nextjs.org/)** and **[FastAPI](https://fastapi.tiangolo.com/)** — the frameworks
- **[shadcn/ui](https://ui.shadcn.com/)** — the component primitives
- **[SQLModel](https://sqlmodel.tiangolo.com/)**, **[Alembic](https://alembic.sqlalchemy.org/)**, **[PostgreSQL](https://www.postgresql.org/)** — the data stack

## License

[MIT](./LICENSE) — do what you want with it.

---

<sub>Built by [Feco](https://github.com/feconroses). Questions, ideas, or just saying hi → [Discussions](https://github.com/feconroses/hunty/discussions).</sub>
