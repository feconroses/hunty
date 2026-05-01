# Contributing to Hunty

First off — thanks for being here. Hunty is an early-stage open-source project, and contributors of every kind are genuinely welcome: bug reports, design ideas, code, docs, even just trying it out and telling me what broke.

This guide covers how to get set up, find something to work on, and get your contribution merged.

## Quick orientation

- **Project README** — start at [README.md](./README.md) if you're new.
- **Roadmap** — [ROADMAP.md](./ROADMAP.md) shows what's planned. The biggest open project is the **Hunty Chrome extension** (replacing the Claude dependency).
- **Discussions** — [GitHub Discussions](https://github.com/feconroses/hunty/discussions) is the friendliest place to ask. Use it for questions, ideas, and proposals.
- **Issues** — [GitHub Issues](https://github.com/feconroses/hunty/issues) is for bug reports and tracked work.

## Ways to contribute

- **Try it and report.** Install Hunty, run through the flow, open an issue for anything broken or rough. This is genuinely high-value.
- **Tackle an open issue.** Anything labelled `good first issue` is a friendly starting point.
- **Pick something off the roadmap.** Open a thread in Discussions first so we can scope it together.
- **Improve the docs.** README / CONTRIBUTING / ROADMAP / inline-comment changes are PRs we always merge fast.
- **Propose a feature.** Open an issue describing the problem first; we'll discuss the approach before code.

## Development

Hunty is a monorepo: `frontend/` (Next.js) + `backend/` (FastAPI) + Postgres. Docker Compose is the easiest setup.

### With Docker (recommended)

```bash
git clone https://github.com/feconroses/hunty.git
cd hunty
cp .env.example .env
docker-compose up
```

That's it. Docker brings up Postgres, runs migrations, and starts both services with hot reload.

- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (`/docs` for Swagger)

### Without Docker

You'll need Python 3.12+, Node.js 18+, and a local PostgreSQL 16. (Or run just the `db` service from `docker-compose.yml`.)

**Backend:**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # set DATABASE_URL to your local Postgres
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Project layout

```
hunty/
├── backend/                    # FastAPI service
│   ├── app/
│   │   ├── routers/           # HTTP endpoints
│   │   ├── services/          # Business logic
│   │   ├── models/            # SQLModel ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── auth/              # JWT + password handling
│   └── alembic/               # Migrations
├── frontend/                   # Next.js 16 App Router
│   └── src/
│       ├── app/(dashboard)/   # Authenticated pages (jobs, tasks, etc.)
│       ├── app/(auth)/        # Login, register, password reset
│       ├── components/        # shadcn/ui + custom components
│       └── lib/               # API client, hooks, utilities
└── docker-compose.yml
```

## Branch & PR conventions

- **Branch off `main`.** Name branches like `feat/short-description`, `fix/short-description`, `docs/short-description`.
- **Conventional Commits.** Start commit messages with `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:`. Example: `feat: add salary range filter to LinkedIn searches`.
- **Small PRs.** One logical change per PR. Easier to review, easier to merge.
- **Reference issues.** `Closes #123` in the PR body if you're closing one.
- **Update docs.** If you change behavior, update README / CONTRIBUTING / ROADMAP / code comments accordingly.

## Code style

- **Python:** PEP 8, type hints where reasonable, async-first (`async def` for endpoints and services).
- **TypeScript:** strict mode, prefer functional components and hooks, follow shadcn/ui conventions for new components.
- **Avoid premature abstraction.** Three similar lines is better than a half-baked helper.
- **Keep it simple.** If a change adds complexity, the PR description should explain why.

## Testing

Test coverage is currently light — adding tests is itself a great contribution. Where tests exist:

- **Backend:** `pytest` from `backend/`.
- **Frontend:** none yet — Playwright/E2E setup is on the [roadmap](./ROADMAP.md).

For now: manually verify your change works in the app before opening a PR, and document the verification steps in the PR description.

## Where to ask

- **Quick questions:** [Discussions → Q&A](https://github.com/feconroses/hunty/discussions).
- **Bug reports:** open an [issue](https://github.com/feconroses/hunty/issues) with steps to reproduce.
- **Feature ideas:** [Discussions → Ideas](https://github.com/feconroses/hunty/discussions), or a tracking issue for something concrete.
- **Security:** if you find a vulnerability, please reach out privately rather than opening a public issue. (For v1, that means a Discussions DM or finding me through GitHub — I'll add a SECURITY.md as the project grows.)

## Code of conduct

Be kind. We follow the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Disagree freely, but stay respectful — this is a place for thoughtful collaboration, not flame wars.

---

Thanks again. I'll do my best to review PRs within a few days.

— Federico
