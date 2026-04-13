# Settings & Home Profile — Wire to Real Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded mock data on Settings and Home Profile pages with real API data so users see their actual information.

**Architecture:** Add a `GET /api/user/profile` endpoint for user info. Add a `GET /api/home-profile` endpoint that returns home details + systems + appliances in one call. Wire Settings page to `GET/PUT /api/settings` and user profile. Wire Home Profile page to home-profile + documents + contractors APIs. Remove theme selector (dark mode disabled). Add document upload/delete functionality. Add contractors section.

**Tech Stack:** Next.js 16 App Router, React client components, Drizzle ORM, Zod, TypeScript, Tailwind CSS

---

### Task 1: Add GET /api/user/profile endpoint

**Files:**
- Create: `src/app/api/user/profile/route.ts`

This endpoint returns the authenticated user's name, email, avatarUrl, and timezone from the `users` table.

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(async ({ user }) => {
  return NextResponse.json({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
  });
});
```

- [ ] **Step 2: Verify it works**

Run: `npm run build`
Expected: Build succeeds with new route `/api/user/profile` listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/profile/route.ts
git commit -m "feat: add GET /api/user/profile endpoint"
```

---

### Task 2: Add GET /api/home-profile endpoint

**Files:**
- Create: `src/app/api/home-profile/route.ts`

Returns full home details including systems, appliances, and summary stats for the active home. This consolidates what the Home Profile page needs into one call.

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/home-profile/route.ts
import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeSystems, appliances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ home: null, systems: [], appliances: [] });
  }

  const systems = await db
    .select()
    .from(homeSystems)
    .where(eq(homeSystems.homeId, home.id))
    .orderBy(homeSystems.systemType);

  const homeAppliances = await db
    .select()
    .from(appliances)
    .where(eq(appliances.homeId, home.id))
    .orderBy(appliances.category, appliances.name);

  return NextResponse.json({
    home: {
      id: home.id,
      name: home.name,
      type: home.type,
      yearBuilt: home.yearBuilt,
      squareFootage: home.squareFootage,
      addressLine1: home.addressLine1,
      city: home.city,
      state: home.state,
      zipCode: home.zipCode,
      ownerRole: home.ownerRole,
      climateZone: home.climateZone,
      memberRole: home.memberRole,
    },
    systems: systems.map((s) => ({
      id: s.id,
      systemType: s.systemType,
      subtype: s.subtype,
      notes: s.notes,
    })),
    appliances: homeAppliances.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      purchaseDate: a.purchaseDate,
      warrantyExpiry: a.warrantyExpiry,
    })),
  });
});
```

- [ ] **Step 2: Verify it works**

Run: `npm run build`
Expected: Build succeeds with new route `/api/home-profile` listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/home-profile/route.ts
git commit -m "feat: add GET /api/home-profile endpoint"
```

---

### Task 3: Rewrite Settings page with real data

**Files:**
- Modify: `src/app/(app)/settings/page.tsx` (full rewrite)

Replace hardcoded USER object and mock toggles. Fetch user profile from `GET /api/user/profile` and notification prefs from `GET /api/settings`. Persist toggle changes via `PUT /api/settings`. Remove theme selector (dark mode is disabled). Show real user name/email/timezone.

- [ ] **Step 1: Rewrite the Settings page**

Replace the entire contents of `src/app/(app)/settings/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "@/lib/auth/actions";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserProfile {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
}

interface NotificationPrefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
  reminderDaysBefore: number[];
  weeklyDigest: boolean;
  weeklyDigestDay: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const REMINDER_TIME_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

/* ------------------------------------------------------------------ */
/*  iOS Toggle Switch                                                  */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-[26px] rounded-full relative cursor-pointer transition-colors ${
        checked
          ? "bg-[var(--color-primary-500)]"
          : "bg-[var(--color-neutral-200)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow-sm absolute top-[3px] transition-transform ${
          checked ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-neutral-400)] mb-2">
        {label}
      </p>
      <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function Row({
  label,
  value,
  chevron = false,
  toggle,
  onClick,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  toggle?: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-neutral-100)] last:border-b-0 w-full text-left"
    >
      <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
        {label}
      </span>
      {toggle ?? (
        <span className="text-[13px] text-[var(--color-neutral-400)] font-medium">
          {value}
          {chevron && " \u203A"}
        </span>
      )}
    </Wrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, prefsRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/settings"),
      ]);
      if (userRes.ok) setUser(await userRes.json());
      if (prefsRes.ok) setPrefs(await prefsRes.json());
    } catch {
      // silently fail — page shows loading state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePref = useCallback(
    async (update: Partial<NotificationPrefs>) => {
      if (!prefs) return;
      const optimistic = { ...prefs, ...update };
      setPrefs(optimistic);
      setSaving(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
        if (res.ok) {
          setPrefs(await res.json());
        } else {
          setPrefs(prefs); // revert on failure
        }
      } catch {
        setPrefs(prefs); // revert on failure
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  /* Derive display values */
  const reminderTimeLabel =
    REMINDER_TIME_OPTIONS.find((o) => o.value === prefs?.reminderTime)?.label ??
    prefs?.reminderTime ??
    "—";

  const reminderDaysLabel = prefs?.reminderDaysBefore
    ? [...prefs.reminderDaysBefore].sort((a, b) => a - b).join(", ") + " days"
    : "—";

  const timezoneLabel =
    TIMEZONE_OPTIONS.find((o) => o.value === user?.timezone)?.label ??
    user?.timezone ??
    "—";

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <Skeleton className="h-7 w-24" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-[22px] font-extrabold tracking-tight mb-5">
        Settings
      </h1>

      {/* ---- Notifications ---- */}
      <Section label="Notifications">
        <Row
          label="Push notifications"
          toggle={
            <Toggle
              checked={prefs?.pushEnabled ?? true}
              onChange={(v) => updatePref({ pushEnabled: v })}
              label="Push notifications"
              disabled={saving}
            />
          }
        />
        <Row
          label="Weekly digest email"
          toggle={
            <Toggle
              checked={prefs?.weeklyDigest ?? false}
              onChange={(v) => updatePref({ weeklyDigest: v })}
              label="Weekly digest email"
              disabled={saving}
            />
          }
        />
        <Row label="Reminder time" value={reminderTimeLabel} chevron />
        <Row label="Remind me before" value={reminderDaysLabel} chevron />
      </Section>

      {/* ---- Account ---- */}
      <Section label="Account">
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Timezone" value={timezoneLabel} />
      </Section>

      {/* ---- About ---- */}
      <Section label="About">
        <Row label="Version" value="0.1.0" />
        <Row label="Terms of Service" chevron />
        <Row label="Privacy Policy" chevron />
      </Section>

      {/* ---- Sign Out ---- */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full py-3.5 bg-red-50 rounded-2xl text-[15px] font-bold text-red-600 text-center mt-4"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/settings/page.tsx
git commit -m "feat: wire Settings page to real user profile and notification APIs"
```

---

### Task 4: Rewrite Home Profile page with real data

**Files:**
- Modify: `src/app/(app)/home-profile/page.tsx` (full rewrite)

Replace all mock constants (HOME, SYSTEMS, APPLIANCES, DOCUMENTS) with data fetched from:
- `GET /api/home-profile` — home details, systems, appliances
- `GET /api/documents?homeId=...` — real documents with signed URLs
- `GET /api/contractors?homeId=...` — real contractors
- Members section stays as-is (already live)

Add document upload (wired to `POST /api/documents`), document delete (wired to `DELETE /api/documents`), and contractors display section.

- [ ] **Step 1: Rewrite the Home Profile page**

Replace the entire contents of `src/app/(app)/home-profile/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Input,
  Dialog,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  FileText,
  ShieldCheck,
  BookOpen,
  Receipt,
  Upload,
  Trash2,
  Phone,
  Star,
  Wrench,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HomeData {
  id: string;
  name: string;
  type: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ownerRole: string | null;
  climateZone: string | null;
  memberRole: string;
}

interface SystemData {
  id: string;
  systemType: string;
  subtype: string | null;
}

interface ApplianceData {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  warrantyExpiry: string | null;
}

interface DocData {
  id: string;
  name: string;
  type: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  signedUrl: string | null;
  createdAt: string;
}

interface ContractorData {
  id: string;
  name: string;
  company: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface Invite {
  id: string;
  invitedEmail: string;
  status: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SYSTEM_LABELS: Record<string, { emoji: string; label: string }> = {
  hvac: { emoji: "\u{1F321}\uFE0F", label: "HVAC" },
  plumbing: { emoji: "\u{1F6BF}", label: "Plumbing" },
  electrical: { emoji: "\u26A1", label: "Electrical" },
  roofing: { emoji: "\u{1F3E0}", label: "Roofing" },
  foundation: { emoji: "\u{1F9F1}", label: "Foundation" },
  water_source: { emoji: "\u{1F4A7}", label: "Water Source" },
  sewage: { emoji: "\u{1F527}", label: "Sewer / Septic" },
  irrigation: { emoji: "\u{1F331}", label: "Irrigation" },
  pool: { emoji: "\u{1F3CA}", label: "Pool" },
  security: { emoji: "\u{1F512}", label: "Security" },
};

const APPLIANCE_GROUP_LABELS: Record<string, string> = {
  refrigerator: "Kitchen",
  dishwasher: "Kitchen",
  oven_range: "Kitchen",
  microwave: "Kitchen",
  garbage_disposal: "Kitchen",
  washing_machine: "Laundry",
  dryer: "Laundry",
  water_heater: "Water & Heating",
  furnace: "Water & Heating",
  ac_unit: "Water & Heating",
  water_softener: "Water & Heating",
  water_filter: "Water & Heating",
  humidifier: "Air Quality",
  dehumidifier: "Air Quality",
  garage_door: "Other",
  pool_pump: "Other",
  hot_tub: "Other",
  sump_pump: "Other",
  generator: "Other",
  other: "Other",
};

const AVATAR_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-purple-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-rose-400 to-pink-500",
];

const DOC_TYPE_VALUES = [
  "warranty", "manual", "receipt", "inspection_report",
  "insurance", "permit", "photo", "other",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitial(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(type: string | null) {
  switch (type) {
    case "insurance":
      return { Icon: ShieldCheck, bg: "bg-red-50", color: "text-red-500" };
    case "warranty":
      return { Icon: FileText, bg: "bg-green-50", color: "text-green-500" };
    case "manual":
      return { Icon: BookOpen, bg: "bg-blue-50", color: "text-blue-500" };
    case "receipt":
      return { Icon: Receipt, bg: "bg-amber-50", color: "text-amber-500" };
    default:
      return { Icon: FileText, bg: "bg-neutral-100", color: "text-neutral-500" };
  }
}

function warrantyStatus(expiry: string | null): { label: string; variant: "success" | "warning" | "danger" | "default" } {
  if (!expiry) return { label: "Unknown", variant: "default" };
  const exp = new Date(expiry);
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (exp < now) return { label: "Expired", variant: "danger" };
  if (exp < threeMonths) return { label: "Expiring", variant: "warning" };
  return { label: "Active", variant: "success" };
}

function homeTypeLabel(type: string | null): string {
  if (!type) return "Home";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Members Section (kept from original — already live)                */
/* ------------------------------------------------------------------ */

function MembersSection({ homeId }: { homeId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/home/invite");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
      setInvites(data.invites || []);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch("/api/home/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite");
      } else {
        setInviteSuccess("Invite sent!");
        setInviteEmail("");
        fetchMembers();
      }
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  const allEntries = [
    ...members.map((m, i) => ({ kind: "member" as const, m, i })),
    ...invites.map((inv, i) => ({ kind: "invite" as const, inv, i: members.length + i })),
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold">Members</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="text-[13px] font-semibold text-[var(--color-primary-600)]"
        >
          Invite &rarr;
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
        {allEntries.length === 0 && (
          <p className="text-sm text-[var(--color-neutral-400)] text-center py-6">
            Invite family members to share this home&apos;s maintenance plan.
          </p>
        )}
        {allEntries.map((entry, idx) => {
          const isLast = idx === allEntries.length - 1;
          if (entry.kind === "member") {
            const m = entry.m;
            const gradientIdx = entry.i % AVATAR_GRADIENTS.length;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[gradientIdx]} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{getInitial(m.name, m.email)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.name || m.email}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">{m.role === "owner" ? "Owner" : "Member"}</p>
                </div>
                {entry.i === 0 && (
                  <span className="bg-[var(--color-primary-50)] text-[var(--color-primary-600)] rounded-full px-2.5 py-0.5 text-[11px] font-bold">You</span>
                )}
              </div>
            );
          } else {
            const inv = entry.inv;
            return (
              <div
                key={inv.id}
                className={`flex items-center gap-3 px-4 py-3 opacity-50 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}
              >
                <div className="w-9 h-9 rounded-full bg-[var(--color-neutral-200)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--color-neutral-500)] font-bold text-sm">{inv.invitedEmail.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{inv.invitedEmail}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">Pending invite</p>
                </div>
                <Badge variant="warning" size="sm">Pending</Badge>
              </div>
            );
          }
        })}
      </div>

      <Dialog
        open={showInvite}
        onClose={() => { setShowInvite(false); setInviteError(""); setInviteSuccess(""); }}
        title="Invite Family Member"
        description="They'll see the same home, tasks, and can mark things complete."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input label="Email address" type="email" placeholder="family@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} error={inviteError} />
          {inviteSuccess && <p className="text-sm text-[var(--color-success-600)]">{inviteSuccess}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} loading={inviteLoading} disabled={!inviteEmail.trim()}>Send Invite</Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomeProfilePage() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [applianceList, setApplianceList] = useState<ApplianceData[]>([]);
  const [docs, setDocs] = useState<DocData[]>([]);
  const [contractorList, setContractorList] = useState<ContractorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<string>("other");

  const fetchAll = useCallback(async () => {
    try {
      const profileRes = await fetch("/api/home-profile");
      if (!profileRes.ok) return;
      const profileData = await profileRes.json();

      setHome(profileData.home);
      setSystems(profileData.systems || []);
      setApplianceList(profileData.appliances || []);

      if (profileData.home?.id) {
        const [docsRes, contractorsRes] = await Promise.all([
          fetch(`/api/documents?homeId=${profileData.home.id}`),
          fetch(`/api/contractors?homeId=${profileData.home.id}`),
        ]);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocs(docsData.documents || []);
        }
        if (contractorsRes.ok) {
          const cData = await contractorsRes.json();
          setContractorList(cData.contractors || []);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim() || !home) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("homeId", home.id);
      formData.append("name", uploadName.trim());
      formData.append("type", uploadType);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (res.ok) {
        setUploadOpen(false);
        setUploadFile(null);
        setUploadName("");
        setUploadType("other");
        // Refresh docs
        const docsRes = await fetch(`/api/documents?homeId=${home.id}`);
        if (docsRes.ok) setDocs((await docsRes.json()).documents || []);
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingDocId(null);
    }
  };

  // Group appliances by area
  const appliancesByGroup = applianceList.reduce<Record<string, ApplianceData[]>>((acc, a) => {
    const group = APPLIANCE_GROUP_LABELS[a.category ?? "other"] ?? "Other";
    (acc[group] ??= []).push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <EmptyState
          title="No home set up"
          description="Complete onboarding to see your home profile."
          action={{ label: "Get Started", onClick: () => window.location.href = "/onboarding" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
      {/* ---- Hero Card ---- */}
      <div className="bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)] rounded-2xl p-6 relative overflow-hidden mb-2">
        <span className="absolute right-[-10px] bottom-[-10px] text-[80px] opacity-15 select-none pointer-events-none">{"\u{1F3E0}"}</span>
        <h1 className="text-[22px] font-extrabold text-[#78350f] tracking-tight">{home.name}</h1>
        <p className="text-[13px] text-[#92400e] font-semibold mt-0.5">
          {homeTypeLabel(home.type)}
          {home.yearBuilt ? ` \u00B7 Built ${home.yearBuilt}` : ""}
          {home.squareFootage ? ` \u00B7 ${home.squareFootage.toLocaleString()} sqft` : ""}
        </p>
        {(home.city || home.state) && (
          <p className="text-[12px] text-[#92400e] mt-1">
            {[home.city, home.state, home.zipCode].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="flex gap-4 mt-4">
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{systems.length}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Systems</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{applianceList.length}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Appliances</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-[#78350f]">{docs.length}</p>
            <p className="text-[11px] text-[#92400e] font-semibold">Documents</p>
          </div>
        </div>
      </div>

      {/* ---- Systems ---- */}
      {systems.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold mb-3">Systems</h2>
          <div className="flex flex-wrap gap-2">
            {systems.map((s) => {
              const info = SYSTEM_LABELS[s.systemType] ?? { emoji: "\u{1F527}", label: s.systemType };
              return (
                <div key={s.id} className="flex items-center gap-2 bg-white border border-[var(--color-neutral-200)] rounded-xl px-3.5 py-2.5">
                  <span className="text-[16px]">{info.emoji}</span>
                  <div>
                    <span className="text-[13px] font-semibold">{info.label}</span>
                    {s.subtype && <span className="text-[11px] text-[var(--color-neutral-400)] ml-1.5">{s.subtype}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Appliances ---- */}
      {applianceList.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold mb-3">Appliances</h2>
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {Object.entries(appliancesByGroup).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-neutral-400)] px-4 pt-3 pb-1">{group}</p>
                {items.map((a, idx) => {
                  const warranty = warrantyStatus(a.warrantyExpiry);
                  const isLast = idx === items.length - 1;
                  return (
                    <div key={a.id} className={`flex items-center justify-between px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{a.name}</p>
                        <p className="text-xs text-[var(--color-neutral-400)]">
                          {[a.brand, a.model].filter(Boolean).join(" ") || "No details"}
                        </p>
                      </div>
                      {a.warrantyExpiry && <Badge variant={warranty.variant} size="sm">{warranty.label}</Badge>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Members ---- */}
      <MembersSection homeId={home.id} />

      {/* ---- Contractors ---- */}
      {contractorList.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold mb-3">Contractors</h2>
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {contractorList.map((c, idx) => {
              const isLast = idx === contractorList.length - 1;
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"}`}>
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {[c.specialty?.replace(/_/g, " "), c.company].filter(Boolean).join(" \u00B7 ") || "General"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {c.rating}
                      </span>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="p-1.5 text-[var(--color-primary-600)]">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Documents ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">Documents</h2>
          <button
            onClick={() => setUploadOpen(true)}
            className="text-[13px] font-semibold text-[var(--color-primary-600)] flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload &rarr;
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="text-sm text-[var(--color-neutral-400)]">No documents yet. Upload warranties, manuals, or receipts.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
            {docs.map((d, idx) => {
              const { Icon, bg, color } = docIcon(d.type);
              const isLast = idx === docs.length - 1;
              const isDeleting = deletingDocId === d.id;
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-[var(--color-neutral-100)]"} ${isDeleting ? "opacity-30" : ""}`}
                >
                  {d.signedUrl ? (
                    <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </a>
                  ) : (
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.name}</p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {d.type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Document"}
                      {d.fileSizeBytes ? ` \u00B7 ${formatFileSize(d.fileSizeBytes)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(d.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document" size="md">
          <div className="space-y-4 mt-2">
            <Input
              label="Document Name"
              placeholder="e.g. Furnace Warranty"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {DOC_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {uploadFile && (
                <p className="text-xs text-[var(--color-neutral-400)]">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName.trim() || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/home-profile/page.tsx
git commit -m "feat: wire Home Profile page to real APIs with document upload/delete and contractors"
```

---

### Task 5: Run full test suite and verify build

**Files:** None (verification only)

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: All 54 tests pass.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with all routes listed.

---
