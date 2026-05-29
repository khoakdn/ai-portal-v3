# Marketing Portal

Internal web application for corporate marketing teams — AI content generation, invoice analysis, and approval workflows.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui-style components
- **Supabase** (Auth + PostgreSQL)
- **Google Gemini API** (`@google/genai`)

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase and Gemini credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── actions/           # Server Actions (Gemini, tasks, invoices)
├── app/
│   ├── (dashboard)/   # Authenticated app routes with sidebar
│   │   ├── dashboard/
│   │   ├── content/
│   │   ├── invoices/
│   │   ├── tasks/
│   │   └── integrations/
│   └── layout.tsx
├── components/
│   ├── content/       # Feature-specific UI
│   ├── layout/        # Sidebar, dashboard shell
│   ├── shared/        # StatusBadge, etc.
│   └── ui/            # shadcn-style primitives
├── lib/
│   ├── gemini/        # Gemini client + extractors
│   ├── integrations/  # Teams & Basecamp webhooks
│   └── supabase/      # Browser + server clients
└── types/             # Domain + Supabase types

supabase/
└── migrations/        # SQL schema
```

## Database Schema

Run `supabase/migrations/001_initial_schema.sql` in your Supabase project.

| Table | Purpose |
|-------|---------|
| `profiles` | Team members (linked to `auth.users`) |
| `tasks` | Central workflow entity with status & assignment |
| `content_drafts` | AI-generated press releases & social posts |
| `invoices` | Uploaded invoice metadata & extracted fields |
| `invoice_line_items` | Line-item breakdown per invoice |

## Environment Variables

See `.env.example` for required keys.
