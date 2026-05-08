# CampusPilot AI

CampusPilot AI is a full-stack academic department management assistant. It combines role-based dashboards, AI chat over department knowledge, service request workflows, document generation, scheduling, notices, approvals, reports, and admin tools.

The project is built with Next.js App Router, TypeScript, MongoDB/Mongoose, Auth.js, OpenAI, Cloudinary, TailwindCSS, and Zod.

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` with the required values:

```bash
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=
OPENAI_EMBEDDING_MODEL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Build and type-check production app
npm run start    # Start production server
npm run lint     # Run ESLint
```

## User Roles

- `student`: AI chat, notices, schedules, ticket submission, ticket tracking, notifications.
- `faculty`: AI chat, ticket operations, document center, reports, schedules, notices.
- `admin`: full management access, including users, master data, schedules, notices, approvals, KB upload, reports, and activity logs.
- `registrar`: approvals, notices, documents, reports, ticket operations, and schedules.

Account creation is admin-only. Student profile records are created automatically when an admin creates a student user.

## Implemented Modules

- Authentication and role-based access control.
- AI chat with knowledge base retrieval and FAQ fallback.
- Chat-to-ticket routing for students.
- Knowledge base upload and semantic search.
- Ticket creation, assignment, status workflow, escalation, and activity logs.
- Ticket detail conversation threads.
- AI-assisted document generation with Cloudinary storage.
- Document template library and generated-document registry.
- Real approval records and approve/reject workflow.
- Schedule creation, updates, rescheduling, deletion, conflict checks, and change logs.
- Department notices with role-filtered reading and audience broadcasts.
- Master data management for departments, students, faculty, courses, rooms, and lab resources.
- Notifications, reports, analytics, and admin activity logs.
- Workflow task tracking and reminder dispatch.

## Important Routes

- `/` public landing page
- `/login` sign in
- `/dashboard` role-aware dashboard
- `/chat` AI assistant
- `/notices` role-filtered notices
- `/notifications` notification center
- `/schedules` schedule viewer
- `/tickets` student ticket tracking
- `/tickets/[id]` ticket conversation thread
- `/tickets/new` student ticket submission
- `/dashboard/tickets` ticket operations
- `/dashboard/schedules` schedule admin
- `/dashboard/master-data` master data admin
- `/dashboard/faqs` FAQ management
- `/dashboard/kb` knowledge base upload
- `/dashboard/documents` document center
- `/dashboard/approvals` approvals queue
- `/dashboard/notices` notice composer
- `/dashboard/notifications` notification broadcast composer
- `/dashboard/reports` reports
- `/dashboard/activity` activity log
- `/register` admin-only user provisioning

## Project Structure

- `app/`: Next.js pages and API routes.
- `components/`: reusable UI and feature-specific client components.
- `services/`: business logic for APIs and workflows.
- `models/`: Mongoose models.
- `lib/`: shared clients and configuration.
- `utils/`: request helpers and shared utilities.

## Documentation

The main project documentation lives outside this app folder:

- `../docs/Main-Req.md`: original requirements.
- `../docs/API_ROUTES.md`: backend API route registry.
- `../docs/BACKEND_DOCS.md`: backend architecture and implementation status.
- `../docs/FRONTEND_DOCS.md`: frontend route map, role navigation, and UI flows.
- `../docs/MISSING_FEATURES.md`: remaining implementation backlog.
- `../docs/CURSOR_RULES.md`: development rules and coding standards.

Keep these docs updated whenever routes, workflows, permissions, or major UI behavior changes.
