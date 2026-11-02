---
name: eventicate-engineering-quality
description: Apply focused TypeScript, React, API design, and security review practices when changing Eventicate's frontend or backend code.
---

# Eventicate engineering quality

Use alongside `eventicate-product` for implementation work. The project uses Next.js 15 and React 19 in `src/`, and an Express 5 / TypeScript API with Prisma in `backend/`.

## Choose only the relevant guidance

- Frontend TypeScript or React changes: use TypeScript and React patterns; for Next.js performance, also consult the available Vercel React best-practices skill.
- Backend route or API changes: use API design and backend patterns. Preserve existing Express route, Zod validation, Prisma, response, and authorization conventions.
- Authentication, attendee data, uploads, payment configuration, M-Pesa, ticket orders, signed QR codes, or check-in: do a focused security review of the affected paths.
- Browser-level user flow changes: use the available Playwright skill when browser verification is requested or otherwise authorized.

## Project-specific constraints

- Inspect neighboring code and the current Prisma schema before proposing a new abstraction or data shape.
- Validate request input with the project's existing Zod patterns. Keep authorization checks server-side and scoped to the organizer, provider, attendee, or admin role involved.
- Do not expose secrets, invitation tokens, signed ticket payloads, attendee contact details, or internal error details in responses or logs.
- For tickets, preserve inventory transactionality and one-time check-in behavior. Keep ticket orders separate from service bookings.
- For payments, preserve the current inactive paid-ticket checkout boundary. Do not activate real charges or payouts as part of a readiness or review change.
- Adapt generic ECC examples to this repository. It does not use Supabase, and examples for unrelated frameworks or database stacks do not apply.
- Follow the current task's validation instructions. Do not add or run tests, create checkpoint commits, or change scope unless the user or higher-priority instructions authorize it.

## ECC references

These are the official ECC source skills this guide draws from; use them as optional references rather than installing ECC's complete plugin, hooks, MCP configuration, or unrelated skills:

- [TypeScript patterns](https://github.com/affaan-m/ECC/tree/main/skills/typescript-patterns)
- [React patterns](https://github.com/affaan-m/ECC/tree/main/skills/react-patterns)
- [Backend patterns](https://github.com/affaan-m/ECC/tree/main/skills/backend-patterns)
- [API design](https://github.com/affaan-m/ECC/tree/main/skills/api-design)
- [Security review](https://github.com/affaan-m/ECC/tree/main/skills/security-review)
- [E2E testing](https://github.com/affaan-m/ECC/tree/main/skills/e2e-testing)
