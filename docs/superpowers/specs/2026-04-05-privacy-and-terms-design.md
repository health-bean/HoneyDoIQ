# Privacy Policy & Terms of Service — Design Spec

## Overview

Add Privacy Policy and Terms of Service pages to HoneyDoIQ. Required for Apple App Store and Google Play Store submission. Both pages are static content, no API calls.

## Pages

### Privacy Policy (`/privacy`)

Static page. Sections:

1. **Introduction** — HealthBean LLC operates HoneyDoIQ. Effective date.
2. **Information We Collect**
   - Account info via Google OAuth (name, email, profile photo)
   - Home details (address, type, year built, square footage, systems, appliances)
   - Task and maintenance data (schedules, completions, notes)
   - Documents uploaded by users (warranties, insurance, receipts, manuals — may contain PII)
   - Household health flags (allergies, pets, children, elderly, immunocompromised)
   - Contractor information (names, phone numbers, emails)
   - Push notification subscription data
   - Device and usage data (browser, OS via Sentry error tracking)
3. **How We Use Your Information** — Provide the service, send notifications/emails, calculate health scores, improve the app
4. **How We Store Your Data** — PostgreSQL via Supabase, documents in Supabase Storage with signed URLs (15-min expiry), hosted on Vercel
5. **Third-Party Services** — Google (OAuth), Supabase (database + storage), Resend (email), Sentry (error tracking), Vercel (hosting). No data is sold.
6. **Data Sharing** — We do not sell or share personal data with third parties for marketing. Data shared only with service providers listed above as necessary to operate the app.
7. **Your Rights** — Access, correct, or delete your data by contacting support@healthbean.io. Account deletion removes all associated data.
8. **Children's Privacy** — Not intended for children under 13. We do not knowingly collect data from children under 13.
9. **Changes to This Policy** — We may update this policy. Changes posted on this page with updated effective date.
10. **Contact** — support@healthbean.io, HealthBean LLC, Maryland, USA

### Terms of Service (`/terms`)

Static page. Sections:

1. **Acceptance** — By using HoneyDoIQ you agree to these terms. If you don't agree, don't use the app.
2. **The Service** — HoneyDoIQ is a home maintenance tracking tool operated by HealthBean LLC.
3. **Accounts** — You sign in via Google OAuth. You're responsible for your account activity. One person per account.
4. **Acceptable Use** — Don't misuse the service (no illegal activity, no reverse engineering, no automated scraping, no uploading malicious files).
5. **Your Content** — You own your data (home details, documents, task data). You grant HealthBean LLC a license to store and process it to provide the service. We don't claim ownership.
6. **Health Score Disclaimer** — The home health score reflects task completion compliance only. It is NOT a safety assessment, home inspection, or professional evaluation. Do not rely on it for safety decisions. Always consult qualified professionals for home safety concerns.
7. **Documents & Files** — You are responsible for the content you upload. Do not upload content you don't have rights to.
8. **Availability** — We aim for high availability but don't guarantee uninterrupted service. We may modify or discontinue features.
9. **Limitation of Liability** — HealthBean LLC is not liable for indirect, incidental, or consequential damages. Total liability limited to the amount you paid (currently $0 for free tier).
10. **Termination** — We may suspend or terminate accounts that violate these terms. You may delete your account at any time.
11. **Governing Law** — These terms are governed by the laws of the State of Maryland, USA.
12. **Changes** — We may update these terms. Continued use after changes constitutes acceptance.
13. **Contact** — support@healthbean.io, HealthBean LLC, Maryland, USA

## Routing & Access

- `/privacy` and `/terms` are public routes (no auth required — App Store reviewers must access them)
- Add to middleware public route list
- Both pages use the same warm stone/amber design as the landing page but with a clean reading layout

## Navigation Links

- **Settings page:** "Terms of Service" and "Privacy Policy" rows become links to `/terms` and `/privacy`
- **Landing page:** Add small footer links "Privacy Policy" and "Terms of Service"
- **Onboarding (optional):** No link needed — not required by app stores

## Design

- Match existing app typography (Plus Jakarta Sans)
- Light background (`bg-[#fafaf9]`)
- Max width `max-w-2xl`, comfortable reading line length
- Section headings in bold, body in neutral text
- Back link at top to return to previous page
- No bottom nav (these are standalone pages, not app pages)
