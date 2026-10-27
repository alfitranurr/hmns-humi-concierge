# HUMI: AI concierge for HMNS Perfume on Discord

n8n + Groq (chat: `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`) + Gemini (embeddings only) + Qdrant + PostgreSQL + a Node.js Discord relay, all in Docker Compose. Read `README.md` for the architecture and `docs/PROGRESS.md` for the current plan and status table (Indonesian). Continue from that table and update it after every step. Reply to the user in Bahasa Indonesia.

## Rules

- **Secrets:** values live only in `.env` (git-ignored) and in n8n's credential store. Never read, print or copy secret values (Discord token, Gemini key, Postgres password, Google OAuth). Refer to them by variable name; the user pastes values themselves.
- **Public repo:** `github.com/alfitranurr/hmns-humi-concierge` is public. Before any commit, check that workflow JSON, SQL and docs contain no credentials, tokens, personal data or real customer chats.
- **n8n workflows:** the source of truth is the running n8n instance. After a change, export the workflow to `n8n/workflows/` and check the JSON for credential values. Test admin and customer branches through a real Discord message, not by executing single nodes (branches need the trigger path).
- **Database:** application tables (`products`, admin tables, `humi_chat_memory`) are separate from n8n's internal tables. Schema changes need the user's approval; keep `postgres/init/*.sql` in sync with the live schema.
- **Destructive commands** (`docker compose down -v`, dropping tables, deleting Qdrant collections) need the user's explicit approval first.
- **No commit, push or deploy** without the user's approval.
- **Customer Agent prompt:** `prompts/customer-agent.md` is the source of the AI Agent's system message; the workflow appends a `## KONTEKS PESAN INI` block (name, first chat, place, time). Re-importing a workflow with `n8n import:workflow` unpublishes it, so the user has to Publish it again.
- **Code exploration:** this repo opts in to `codebase-memory-mcp` (project name `hmns-humi-concierge`). Index with `mode: moderate` so `.gitignore` keeps `.env` out of the index, and without `persistence` so no `.codebase-memory/` folder lands in the public repo.
