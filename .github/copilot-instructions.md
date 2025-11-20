# copilot-instructions-fullstack.md

## Engineering Directive for AI Assistants (Full‑Stack – Procurement Management System)

> **Audience:** GitHub Copilot, ChatGPT-Coder, and all AI systems generating backend or frontend code for this repository.  
> **Goal:** Deliver a cohesive, production-ready, enterprise-grade full‑stack system with consistent architecture, security, and workflow integrity.

---

# 1. GLOBAL EXPECTATIONS (APPLIES TO BACKEND + FRONTEND)

-   Always generate **strict TypeScript** — no `any`, no implicit casts.
-   Preserve the **existing folder structure**, naming conventions, and architectural patterns.
-   Write code that is **deterministic, testable, and production-safe**.
-   Never introduce new dependencies without explicit architectural justification.
-   Maintain consistent error structures, logging patterns, and workflow rules.
-   Treat all user input and uploaded files as **untrusted** until validated.

---

# 2. BACKEND ARCHITECTURE RULES

## 2.1 Technology Stack

-   **Runtime:** Node.js + Express.js (ES Modules)
-   **Language:** TypeScript (strict mode)
-   **Database:** PostgreSQL using Prisma ORM (no raw SQL unless documented)
-   **Auth:** JWT (access + refresh), bcrypt password hashing
-   **Security:** Helmet, strict CORS, validation + sanitization layers
-   **Logging:** Winston structured logs (no console logs)
-   **File Handling:** Multer for uploads with validation

---

## 2.2 Backend Code Standards

### Controllers

-   Thin controllers: validate → call service → format response.
-   No business logic in controllers.

### Services

-   Contain all business logic.
-   Pure, testable, deterministic.
-   Database interactions must go through typed Prisma queries.

### Middleware

-   Centralized async error handling.
-   Enforce JWT auth + role-based permissions.

### Validation

-   Use schema validators (Zod/Yup/Joi).
-   Reject bad input before business logic.

### Error Format

```
{
  "success": false,
  "message": "Readable error message",
  "details": {}
}
```

### Logging

-   Winston only.
-   Log workflow moves, approvals, errors, warnings.
-   Never log secrets/tokens.

---

# 3. FRONTEND ARCHITECTURE RULES

## 3.1 Technology Stack

-   **Framework:** React + TypeScript
-   **State:** Zustand / Redux Toolkit (match repo)
-   **UI:** TailwindCSS + shadcn/ui (or internal components)
-   **Forms:** React Hook Form + Zod
-   **Routing:** React Router or Next.js (match repo)
-   **Data Fetching:** API services layer or React Query
-   **Security:** JWT handling, role-based view guards

---

## 3.2 Frontend Code Standards

### Components

-   Functional components only.
-   Keep components small, pure, and reusable.
-   Never embed business logic — move it to hooks/services.

### API Integration

-   Use centralized API client only.
-   All calls must be typed.
-   Handle errors with a consistent pattern.
-   Respect auth rules and token flow.

### State Management

-   Minimize global state.
-   Never store derived state.
-   Avoid unnecessary re-renders.

### Validation

-   All forms must use React Hook Form + Zod.
-   Match backend schemas exactly.

### UI Standards

-   Follow existing design system.
-   Tailwind for all styling (no inline CSS unless required).
-   Ensure responsiveness + accessibility compliance.

---

# 4. FULL‑STACK SECURITY RULES (HIGH PRIORITY)

-   No hardcoded secrets or environment values.
-   JWT tokens must be handled securely and never logged.
-   Use environment variables for all config.
-   Only authorized roles may see role‑restricted UI elements.
-   Sanitize all user-facing content.
-   Treat all file uploads as untrusted.

---

# 5. PROCUREMENT WORKFLOW LOGIC (BACKEND + FRONTEND)

AI-generated code must preserve the exact workflow:

**Creator → Department Head → Executive Director**

Requirements:

-   Persist timestamps, user IDs, decision states.
-   Only authorized users may approve/reject.
-   Trigger audit logs and notifications for each stage.
-   UI must visually reflect workflow state accurately.
-   Prevent invalid or incomplete submissions at any layer.

---

# 6. PERFORMANCE STANDARDS (FULL‑STACK)

### Backend

-   Avoid N+1 queries; use Prisma includes.
-   Cache where appropriate.
-   Keep services stateless.

### Frontend

-   Use memoization (`useMemo`, `useCallback`, `React.memo`).
-   Lazy-load large routes/components.
-   Avoid unnecessary API calls and re-renders.

---

# 7. CONFIG & ENVIRONMENT RULES

-   All config comes from environment variables.
-   Update `.env.example` when adding new config.
-   Never commit secrets or sample secrets.
-   Backend + frontend must use consistent environment patterns.

---

# 8. FILE & FOLDER STRUCTURE (FULL‑STACK)

Copilot must preserve:

### Backend

-   `/controllers`
-   `/services`
-   `/middleware`
-   `/routes`
-   `/prisma`
-   `/utils`
-   `/types`

### Frontend

-   `/components`
-   `/pages` or `/routes`
-   `/services`
-   `/hooks`
-   `/store`
-   `/types`
-   `/lib`
-   `/styles`

---

# 9. FORBIDDEN BEHAVIORS (GLOBAL NO‑GO LIST)

Copilot must _never_:

-   Generate code with `any` or unsafe casting.
-   Add dependencies without explicit architectural purpose.
-   Break backend or frontend folder structure.
-   Hardcode tokens, URLs, secrets, or magic numbers.
-   Mix business logic into controllers or UI components.
-   Perform direct DOM manipulation unless using refs properly.
-   Produce untyped API calls or untyped Prisma queries.

---

# 10. HOW COPILOT SHOULD THINK

Before generating code, it must ask:

1. Does this conform to backend + frontend architecture?
2. Is this secure, typed, and production-grade?
3. Does this preserve the procurement workflow’s business rules?
4. Would a principal engineer approve this in a real code review?

If not, revise.

---
