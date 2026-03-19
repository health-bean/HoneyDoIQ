# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign onboarding with unified home equipment categories, household health flags, skip-any-step flow, and homeowner-friendly language.

**Architecture:** Add `household_health_flags` table to DB schema. Refactor onboarding page from separate systems/appliances steps into a single unified step grouped by area. Add new household health step. Update onboarding API to accept health flags and use them to adjust task frequency. Add health multipliers to task template system.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, Drizzle ORM, Zod, Lucide React

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/db/schema.ts` | Modify | Add `householdHealthFlags` table |
| `src/lib/api/schemas.ts` | Modify | Add health flags Zod schema, update onboarding schema |
| `src/lib/tasks/templates.ts` | Modify | Add `healthMultipliers` and `healthRequired` fields to TaskTemplate |
| `src/lib/tasks/scheduling.ts` | Modify | Add `adjustFrequencyForHealth()` function |
| `src/lib/tasks/scheduling.test.ts` | Modify | Add tests for health frequency adjustment |
| `src/app/api/onboarding/route.ts` | Modify | Accept health flags, store them, use them for frequency |
| `src/app/onboarding/page.tsx` | Rewrite | New 5-step flow with unified categories and health step |

---

### Task 1: Add household_health_flags table to DB schema

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add the table definition and relations**

Add after the `notificationPreferences` table:

```typescript
export const householdHealthFlags = pgTable("household_health_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  homeId: uuid("home_id").notNull().unique().references(() => homes.id, { onDelete: "cascade" }),
  hasAllergies: boolean("has_allergies").default(false),
  hasYoungChildren: boolean("has_young_children").default(false),
  hasPets: boolean("has_pets").default(false),
  hasElderly: boolean("has_elderly").default(false),
  hasImmunocompromised: boolean("has_immunocompromised").default(false),
  prioritizeAirQuality: boolean("prioritize_air_quality").default(false),
  prioritizeEnergyEfficiency: boolean("prioritize_energy_efficiency").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

Add relations:
```typescript
export const householdHealthFlagsRelations = relations(householdHealthFlags, ({ one }) => ({
  home: one(homes, { fields: [householdHealthFlags.homeId], references: [homes.id] }),
}));
```

Add to homes relations: `healthFlags: one(householdHealthFlags)`

- [ ] **Step 2: Push schema to database**

Run: `DATABASE_URL="postgresql://postgres.zlcnrqewjedtfpsglyxp:REDACTED@aws-1-us-east-1.pooler.supabase.com:6543/postgres" npx drizzle-kit push`

- [ ] **Step 3: Enable RLS on new table**

Run: `psql "postgresql://postgres.zlcnrqewjedtfpsglyxp:REDACTED@aws-1-us-east-1.pooler.supabase.com:6543/postgres" -c "ALTER TABLE public.household_health_flags ENABLE ROW LEVEL SECURITY;"`

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add household_health_flags table for health-based task personalization"
```

---

### Task 2: Add health multipliers to task templates

**Files:**
- Modify: `src/lib/tasks/templates.ts`

- [ ] **Step 1: Extend TaskTemplate interface**

Add two new fields to the `TaskTemplate` interface:

```typescript
// Health flag keys that cause this task's frequency to be multiplied
// e.g., { hasAllergies: 0.5, hasPets: 0.5 } means frequency halved (more often) for those flags
healthMultipliers: Partial<Record<HealthFlagKey, number>>;
// Health flag keys that must be present for this task to appear at all
healthRequired: HealthFlagKey[];
```

Add the type:
```typescript
export type HealthFlagKey =
  | "hasAllergies"
  | "hasYoungChildren"
  | "hasPets"
  | "hasElderly"
  | "hasImmunocompromised"
  | "prioritizeAirQuality"
  | "prioritizeEnergyEfficiency";
```

- [ ] **Step 2: Add default values to all 89 existing templates**

Add `healthMultipliers: {}` and `healthRequired: []` to every template in the array. This is a mass find-and-replace — every template object gets these two fields with empty defaults.

- [ ] **Step 3: Add health multipliers to relevant existing templates**

Key templates to update:
- HVAC filter replacement: `healthMultipliers: { hasAllergies: 0.5, hasPets: 0.5 }` (double frequency)
- Duct cleaning: `healthMultipliers: { hasAllergies: 0.5, prioritizeAirQuality: 0.5 }`
- Water heater flush: `healthMultipliers: { hasYoungChildren: 0.75 }`
- Smoke/CO detector test: `healthMultipliers: { hasYoungChildren: 0.5, hasElderly: 0.5 }`
- Gutter cleaning: `healthMultipliers: { hasAllergies: 0.75 }` (mold prevention)
- Mold inspection: `healthMultipliers: { hasImmunocompromised: 0.5, hasAllergies: 0.5 }`

- [ ] **Step 4: Add new health-only templates**

Add templates that only appear when health flags are set:
- "Check indoor humidity levels" — `healthRequired: ["prioritizeAirQuality"]`, monthly
- "Inspect for mold" — `healthRequired: ["hasImmunocompromised"]`, quarterly
- "Test water quality" — `healthRequired: ["hasImmunocompromised"]`, semi-annually
- "Check outlet covers" — `healthRequired: ["hasYoungChildren"]`, monthly
- "Verify water heater temp < 120°F" — `healthRequired: ["hasYoungChildren"]`, quarterly
- "Check grab bars and handrails" — `healthRequired: ["hasElderly"]`, quarterly
- "Inspect weatherstripping" — `healthRequired: ["prioritizeEnergyEfficiency"]`, semi-annually
- "Energy audit reminder" — `healthRequired: ["prioritizeEnergyEfficiency"]`, annually
- "Clean pet areas and check pet door" — `healthRequired: ["hasPets"]`, monthly
- "Check radon levels" — `healthRequired: ["prioritizeAirQuality"]`, annually

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/templates.ts
git commit -m "feat: add health multipliers and health-only templates"
```

---

### Task 3: Add health frequency adjustment to scheduling

**Files:**
- Modify: `src/lib/tasks/scheduling.ts`
- Modify: `src/lib/tasks/scheduling.test.ts`

- [ ] **Step 1: Write tests for adjustFrequencyForHealth**

```typescript
describe("adjustFrequencyForHealth", () => {
  it("returns original frequency when no flags set", () => {
    const result = adjustFrequencyForHealth(3, { hasAllergies: 0.5 }, {});
    expect(result).toBe(3);
  });

  it("applies multiplier when flag is set", () => {
    const result = adjustFrequencyForHealth(6, { hasAllergies: 0.5 }, { hasAllergies: true });
    expect(result).toBe(3);
  });

  it("applies lowest multiplier when multiple flags match", () => {
    const result = adjustFrequencyForHealth(6, { hasAllergies: 0.5, hasPets: 0.75 }, { hasAllergies: true, hasPets: true });
    expect(result).toBe(3); // 0.5 wins
  });

  it("returns at least 1", () => {
    const result = adjustFrequencyForHealth(1, { hasAllergies: 0.25 }, { hasAllergies: true });
    expect(result).toBe(1);
  });
});

describe("shouldIncludeHealthTemplate", () => {
  it("returns true when no healthRequired", () => {
    expect(shouldIncludeHealthTemplate([], {})).toBe(true);
  });

  it("returns true when required flag is set", () => {
    expect(shouldIncludeHealthTemplate(["hasAllergies"], { hasAllergies: true })).toBe(true);
  });

  it("returns false when required flag is not set", () => {
    expect(shouldIncludeHealthTemplate(["hasAllergies"], {})).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

- [ ] **Step 3: Implement the functions**

Add to `scheduling.ts`:

```typescript
import type { HealthFlagKey } from "./templates";

export type HealthFlags = Partial<Record<HealthFlagKey, boolean>>;

export function adjustFrequencyForHealth(
  frequencyValue: number,
  multipliers: Partial<Record<HealthFlagKey, number>>,
  flags: HealthFlags
): number {
  let lowestMultiplier = 1;
  for (const [key, multiplier] of Object.entries(multipliers)) {
    if (flags[key as HealthFlagKey] && multiplier < lowestMultiplier) {
      lowestMultiplier = multiplier;
    }
  }
  return Math.max(1, Math.round(frequencyValue * lowestMultiplier));
}

export function shouldIncludeHealthTemplate(
  healthRequired: HealthFlagKey[],
  flags: HealthFlags
): boolean {
  if (healthRequired.length === 0) return true;
  return healthRequired.some((key) => flags[key] === true);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

- [ ] **Step 5: Update getApplicableTemplates to accept health flags**

Modify `getApplicableTemplates` to optionally accept health flags and filter with `shouldIncludeHealthTemplate`:

```typescript
export function getApplicableTemplates(home: {
  type: HomeType;
  systems: SystemType[];
  appliances: ApplianceCategory[];
}, healthFlags?: HealthFlags): TaskTemplate[] {
  return TASK_TEMPLATES.filter((template) => {
    // existing home type, system, appliance checks...

    // Health-required filter
    if (template.healthRequired.length > 0 && healthFlags) {
      if (!shouldIncludeHealthTemplate(template.healthRequired, healthFlags)) {
        return false;
      }
    } else if (template.healthRequired.length > 0 && !healthFlags) {
      return false; // Skip health-only templates when no flags provided
    }

    return true;
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/scheduling.ts src/lib/tasks/scheduling.test.ts
git commit -m "feat: add health-based frequency adjustment and template filtering"
```

---

### Task 4: Update Zod schemas and onboarding API

**Files:**
- Modify: `src/lib/api/schemas.ts`
- Modify: `src/app/api/onboarding/route.ts`

- [ ] **Step 1: Add health flags Zod schema**

Add to `schemas.ts`:

```typescript
export const householdHealthSchema = z.object({
  hasAllergies: z.boolean().default(false),
  hasYoungChildren: z.boolean().default(false),
  hasPets: z.boolean().default(false),
  hasElderly: z.boolean().default(false),
  hasImmunocompromised: z.boolean().default(false),
  prioritizeAirQuality: z.boolean().default(false),
  prioritizeEnergyEfficiency: z.boolean().default(false),
});

export type HouseholdHealthInput = z.infer<typeof householdHealthSchema>;
```

- [ ] **Step 2: Update onboardingSchema to include health flags**

```typescript
export const onboardingSchema = z.object({
  home: onboardingHomeSchema,
  systems: z.array(onboardingSystemSchema).max(50),
  appliances: z.array(z.enum(applianceCategoryValues)).max(50),
  taskSetups: z.array(onboardingTaskSetupSchema).max(500),
  householdHealth: householdHealthSchema.optional(),
});
```

- [ ] **Step 3: Update onboarding API to store health flags and adjust frequencies**

In the onboarding route, after creating the home:

```typescript
// Store health flags if provided
if (payload.householdHealth) {
  await db.insert(householdHealthFlags).values({
    homeId: home.id,
    ...payload.householdHealth,
  });
}
```

Update task creation to use health-adjusted frequencies:

```typescript
const healthFlags = payload.householdHealth ?? {};
const templates = getApplicableTemplates(
  { type: homeType, systems: activeSystems, appliances: activeAppliances },
  healthFlags
);

// When creating task instances, adjust frequency:
const adjustedFrequencyValue = adjustFrequencyForHealth(
  template.frequencyValue,
  template.healthMultipliers,
  healthFlags
);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/schemas.ts src/app/api/onboarding/route.ts
git commit -m "feat: onboarding API accepts health flags and adjusts task frequencies"
```

---

### Task 5: Rewrite onboarding page

**Files:**
- Rewrite: `src/app/onboarding/page.tsx`

This is the largest task. The page needs a full rewrite with the new 5-step flow.

- [ ] **Step 1: Define the new data constants**

Replace SYSTEMS and APPLIANCES arrays with a single unified `HOME_ITEMS` structure grouped by area:

```typescript
interface HomeItem {
  key: string;
  label: string;
  icon: string;
  type: "system" | "appliance";
  mappedSystem?: SystemType;
  mappedAppliance?: ApplianceCategory;
  subtypes?: { value: string; label: string }[];
  allowOtherSubtype?: boolean; // shows "Other" text input
}

interface HomeItemGroup {
  label: string; // "Heating & Cooling", "Water & Plumbing", etc.
  items: HomeItem[];
}

const HOME_ITEM_GROUPS: HomeItemGroup[] = [
  {
    label: "Heating & Cooling",
    items: [
      { key: "hvac", label: "Heating & Cooling", icon: "🌡️", type: "system", mappedSystem: "hvac",
        subtypes: [
          { value: "forced-air", label: "Forced Air" },
          { value: "radiant", label: "Radiant" },
          { value: "mini-split", label: "Mini-Split" },
          { value: "window-units", label: "Window Units" },
        ],
      },
      { key: "furnace", label: "Furnace", icon: "🔥", type: "appliance", mappedAppliance: "furnace" },
      { key: "ac-unit", label: "AC Unit", icon: "❄️", type: "appliance", mappedAppliance: "ac_unit" },
    ],
  },
  // ... all other groups per spec
];
```

- [ ] **Step 2: Define health flag options**

```typescript
const HEALTH_OPTIONS = [
  { key: "hasAllergies", label: "Allergies or asthma", icon: "🫁", desc: "We'll increase air quality tasks" },
  { key: "hasYoungChildren", label: "Young children (under 5)", icon: "👶", desc: "We'll add safety checks" },
  { key: "hasPets", label: "Pets", icon: "🐾", desc: "More frequent filter changes" },
  { key: "hasElderly", label: "Elderly family (65+)", icon: "👴", desc: "We'll add accessibility checks" },
  { key: "hasImmunocompromised", label: "Immune-compromised", icon: "🛡️", desc: "Extra mold and water quality checks" },
  { key: "prioritizeAirQuality", label: "Better indoor air quality", icon: "🌱", desc: "Humidity, ventilation, radon" },
  { key: "prioritizeEnergyEfficiency", label: "Energy efficiency", icon: "⚡", desc: "Weatherstripping, insulation, audits" },
];
```

- [ ] **Step 3: Update form state to include health flags and unified selections**

Replace separate `systems` and `appliances` state with:

```typescript
interface FormData {
  name: string;
  type: string;
  ownerRole: string;
  yearBuilt: string;
  sqft: string;
  zip: string;
  state: string;
  selectedItems: Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }>;
  healthFlags: Record<string, boolean>;
  otherNotes: string; // free text for "anything else"
}
```

- [ ] **Step 4: Build Step 3 — "What's In Your Home"**

Grouped by area with small uppercase headers. Items in 2-column grid. When tapped, subtypes show as pills. "Other" text input when `allowOtherSubtype` is true. Final "Other" free text at bottom.

Messaging: "Select what applies — you can always add more from your home profile."

- [ ] **Step 5: Build Step 4 — "Your Household"**

Selection cards for each health option. Each shows icon, label, and description of what it affects.

Messaging: "This helps us personalize your plan — you can set this up anytime in settings."

- [ ] **Step 6: Add skip links to Steps 3, 4, and 5**

Below the Back button on each step, add:

```tsx
<button
  type="button"
  onClick={handleSkip}
  className="text-xs font-medium text-[var(--color-neutral-400)] text-center mt-2 w-full transition-colors hover:text-[var(--color-neutral-500)]"
>
  Skip, I'll set this up later →
</button>
```

Skip handler submits what we have so far and redirects to dashboard.

- [ ] **Step 7: Update data mapping for API submission**

Convert the unified `selectedItems` back into the separate `systems` and `appliances` arrays the API expects:

```typescript
const systems = [];
const appliances = [];
for (const [key, item] of Object.entries(form.selectedItems)) {
  if (!item.enabled) continue;
  const def = allItems.find(i => i.key === key);
  if (def?.type === "system" && def.mappedSystem) {
    const subtypes = item.subtypes.length > 0 ? item.subtypes : ["standard"];
    if (item.otherSubtype) subtypes.push(item.otherSubtype);
    for (const st of subtypes) {
      systems.push({ key: def.mappedSystem, subtype: st });
    }
  } else if (def?.type === "appliance" && def.mappedAppliance) {
    appliances.push(def.mappedAppliance);
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: rewrite onboarding with unified categories, health step, skip flow"
```

---

### Task 6: Verify and push

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass (including new health tests)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Update Notion doc**

Mark onboarding redesign as complete. Add household health feature to the completed list.
