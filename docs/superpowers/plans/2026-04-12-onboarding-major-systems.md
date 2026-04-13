# Onboarding Redesign: Major Systems Focus

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the onboarding "What's In Your Home?" step with a focused "Major Systems" selection organized into 6 groups (Heating, Cooling, Water, Electrical, Structure, Outdoor), add new DB enum values and task templates for newly supported system types, and remove appliances/kitchen/laundry from onboarding (deferred to post-onboarding home profile).

**Architecture:** The onboarding page is a single `page.tsx` client component with step-based state. We'll replace Step 3 (the flat item grid) with a new `StepMajorSystems` component using the same multi-select pattern but reorganized into 6 domain groups. The data model stays the same (systems[] + appliances[] in the API payload). New system types (heat_pump, boiler, etc.) require DB enum migration, Drizzle schema updates, template type updates, and new task templates. Heat pump has special UX logic: selecting it in Heating auto-selects it in Cooling (greyed out).

**Tech Stack:** Next.js 16, React, TypeScript, Drizzle ORM, PostgreSQL (Supabase), Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/db/schema.ts` | Modify | Add new enum values to `system_type` and `appliance_category` |
| `drizzle/0002_add_system_types.sql` | Create | DB migration for new enum values |
| `src/lib/tasks/templates.ts` | Modify | Add `ApplianceCategory` and `SystemType` union members, add new task templates for heat pump, boiler, fireplace, mini-split, evap cooler, solar |
| `src/lib/api/schemas.ts` | Modify | Add new enum values to `systemTypeValues` and `applianceCategoryValues` |
| `src/app/onboarding/page.tsx` | Modify | Replace `HOME_ITEM_GROUPS` constant and `StepWhatsInYourHome` component with new `MAJOR_SYSTEMS` constant and `StepMajorSystems` component |

---

### Task 1: DB Schema — Add New Enum Values

**Files:**
- Modify: `src/lib/db/schema.ts:39-50` (system_type enum), `src/lib/db/schema.ts:67-88` (appliance_category enum)
- Create: `drizzle/0002_add_system_types.sql`

- [ ] **Step 1: Create the DB migration**

Create `drizzle/0002_add_system_types.sql`:

```sql
-- Add new system types for major systems onboarding
ALTER TYPE "public"."system_type" ADD VALUE IF NOT EXISTS 'solar';

-- Add new appliance categories for heating/cooling equipment
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'heat_pump';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'boiler';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'fireplace';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'mini_split';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'evap_cooler';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'solar_panels';
```

- [ ] **Step 2: Update Drizzle schema enums**

In `src/lib/db/schema.ts`, update `systemTypeEnum`:

```typescript
export const systemTypeEnum = pgEnum("system_type", [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "foundation",
  "water_source",
  "sewage",
  "irrigation",
  "pool",
  "security",
  "solar",
]);
```

Update `applianceCategoryEnum`:

```typescript
export const applianceCategoryEnum = pgEnum("appliance_category", [
  "refrigerator",
  "dishwasher",
  "washing_machine",
  "dryer",
  "oven_range",
  "microwave",
  "garbage_disposal",
  "water_heater",
  "furnace",
  "ac_unit",
  "water_softener",
  "water_filter",
  "humidifier",
  "dehumidifier",
  "garage_door",
  "pool_pump",
  "hot_tub",
  "sump_pump",
  "generator",
  "heat_pump",
  "boiler",
  "fireplace",
  "mini_split",
  "evap_cooler",
  "solar_panels",
  "other",
]);
```

- [ ] **Step 3: Apply migration to database**

```bash
source .env.local && psql "$DATABASE_URL" -f drizzle/0002_add_system_types.sql
```

Expected: 7 `ALTER TYPE` successes.

- [ ] **Step 4: Verify with typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add drizzle/0002_add_system_types.sql src/lib/db/schema.ts
git commit -m "feat: add new system/appliance enum values for major systems onboarding"
```

---

### Task 2: Update API Schemas and Template Types

**Files:**
- Modify: `src/lib/api/schemas.ts:23-31` (systemTypeValues, applianceCategoryValues)
- Modify: `src/lib/tasks/templates.ts:20-30` (ApplianceCategory, SystemType types)

- [ ] **Step 1: Update API schema enum arrays**

In `src/lib/api/schemas.ts`, find `systemTypeValues` and update to include `"solar"`:

```typescript
const systemTypeValues = [
  "hvac", "plumbing", "electrical", "roofing", "foundation",
  "water_source", "sewage", "irrigation", "pool", "security", "solar",
] as const;
```

Find `applianceCategoryValues` and update to include new categories:

```typescript
const applianceCategoryValues = [
  "refrigerator", "dishwasher", "washing_machine", "dryer", "oven_range",
  "microwave", "garbage_disposal", "water_heater", "furnace", "ac_unit",
  "water_softener", "water_filter", "humidifier", "dehumidifier", "garage_door",
  "pool_pump", "hot_tub", "sump_pump", "generator", "heat_pump", "boiler",
  "fireplace", "mini_split", "evap_cooler", "solar_panels", "other",
] as const;
```

- [ ] **Step 2: Update template type unions**

In `src/lib/tasks/templates.ts`, update `ApplianceCategory`:

```typescript
export type ApplianceCategory =
  | "refrigerator" | "dishwasher" | "washing_machine" | "dryer"
  | "oven_range" | "microwave" | "garbage_disposal" | "water_heater"
  | "furnace" | "ac_unit" | "water_softener" | "water_filter"
  | "humidifier" | "dehumidifier" | "garage_door" | "pool_pump"
  | "hot_tub" | "sump_pump" | "generator" | "heat_pump"
  | "boiler" | "fireplace" | "mini_split" | "evap_cooler"
  | "solar_panels" | "other";
```

Update `SystemType`:

```typescript
export type SystemType =
  | "hvac" | "plumbing" | "electrical" | "roofing"
  | "foundation" | "water_source" | "sewage" | "irrigation"
  | "pool" | "security" | "solar";
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```

Expected: All 54 tests PASS.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/schemas.ts src/lib/tasks/templates.ts
git commit -m "feat: add new system/appliance types to API schemas and templates"
```

---

### Task 3: Add Task Templates for New Equipment Types

**Files:**
- Modify: `src/lib/tasks/templates.ts` (add new template arrays and include them in the master export)

These templates drive the maintenance tasks that get generated when a user selects equipment during onboarding. Each new equipment type needs at least 2-4 templates covering its key maintenance needs.

- [ ] **Step 1: Find the template export array**

In `src/lib/tasks/templates.ts`, find where template arrays are combined (near bottom of file). It looks like:

```typescript
...hvacTemplates,
```

We'll add new arrays before the export and include them.

- [ ] **Step 2: Add heat pump templates**

Add after the existing `hvacTemplates` array:

```typescript
const heatPumpTemplates: TaskTemplate[] = [
  {
    id: "heat-pump-seasonal-tuneup",
    name: "Heat Pump Seasonal Tune-Up",
    description: "Schedule a professional to inspect and service your heat pump before the heating or cooling season begins.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 6,
    frequencyUnit: "months",
    estimatedMinutes: 60,
    estimatedCostLow: 150,
    estimatedCostHigh: 300,
    diyDifficulty: "professional",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["heat_pump"],
    seasonalMonths: [3, 9],
    healthCategories: ["clean_air"],
    tips: "Heat pumps need service twice a year — once before summer, once before winter. Ask the tech to check refrigerant levels, the reversing valve, and defrost cycle. Many HVAC companies offer service plans.",
    whyItMatters: "A heat pump works year-round unlike a furnace or AC alone. Skipping maintenance leads to 10-25% efficiency loss and can halve the unit's lifespan.",
    healthMultipliers: { prioritizeEnergyEfficiency: 1.5 },
    healthRequired: [],
  },
  {
    id: "heat-pump-clean-filter",
    name: "Clean or Replace Heat Pump Filter",
    description: "Check and clean or replace the air filter on your heat pump. Heat pumps run year-round, so filters get dirty faster.",
    category: "hvac",
    priority: "efficiency",
    frequencyValue: 1,
    frequencyUnit: "months",
    estimatedMinutes: 10,
    estimatedCostLow: 5,
    estimatedCostHigh: 25,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["heat_pump"],
    seasonalMonths: [],
    healthCategories: ["clean_air"],
    tips: "Heat pump filters need more frequent changes than furnace-only systems because the heat pump runs in all seasons. Check monthly, replace when visibly dirty.",
    whyItMatters: "A clogged filter in a heat pump reduces efficiency by 5-15% and makes the system work harder in both heating and cooling modes.",
    healthMultipliers: { hasAllergies: 1.5, hasPets: 1.5, prioritizeAirQuality: 1.5 },
    healthRequired: [],
  },
  {
    id: "heat-pump-clear-outdoor-unit",
    name: "Clear Debris from Heat Pump Outdoor Unit",
    description: "Remove leaves, grass clippings, and debris from around the outdoor heat pump unit. Maintain 2 feet of clearance on all sides.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 3,
    frequencyUnit: "months",
    estimatedMinutes: 15,
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["heat_pump"],
    seasonalMonths: [],
    healthCategories: [],
    tips: "In winter, gently remove snow and ice buildup but never chip ice off the coils. The defrost cycle handles that. In fall, check weekly for leaf accumulation.",
    whyItMatters: "Blocked airflow forces the compressor to work harder, increasing energy costs and risking compressor failure — a $1,500-3,000 repair.",
    healthMultipliers: {},
    healthRequired: [],
  },
];

const boilerTemplates: TaskTemplate[] = [
  {
    id: "boiler-annual-service",
    name: "Annual Boiler Service",
    description: "Schedule a professional to inspect, clean, and tune your boiler before heating season.",
    category: "hvac",
    priority: "safety",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 60,
    estimatedCostLow: 150,
    estimatedCostHigh: 400,
    diyDifficulty: "professional",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["boiler"],
    seasonalMonths: [9, 10],
    healthCategories: ["fire_safety"],
    tips: "Book in September before the rush. The tech should check the heat exchanger, flue, pressure relief valve, and test for carbon monoxide leaks. Ask about a service contract for discounts.",
    whyItMatters: "Boilers can leak carbon monoxide if not properly maintained. Annual service also prevents costly mid-winter breakdowns and keeps efficiency high.",
    healthMultipliers: {},
    healthRequired: [],
  },
  {
    id: "boiler-bleed-radiators",
    name: "Bleed Radiators",
    description: "Release trapped air from radiators to restore even heating. If the top of a radiator is cold while the bottom is hot, it needs bleeding.",
    category: "hvac",
    priority: "efficiency",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 30,
    estimatedCostLow: 0,
    estimatedCostHigh: 10,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["boiler"],
    seasonalMonths: [10],
    healthCategories: [],
    tips: "Use a radiator key (under $5 at any hardware store). Start with the radiators furthest from the boiler. Hold a cloth under the valve, open it until water flows steadily, then close. Check boiler pressure after — it may need topping up.",
    whyItMatters: "Trapped air means the boiler works harder to heat your home. Bleeding takes 30 minutes and can noticeably improve comfort and reduce heating bills.",
    healthMultipliers: { prioritizeEnergyEfficiency: 1.5 },
    healthRequired: [],
  },
  {
    id: "boiler-check-pressure",
    name: "Check Boiler Pressure",
    description: "Check the pressure gauge on your boiler. Normal operating pressure is typically 1-1.5 bar (12-20 psi) when cold.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 1,
    frequencyUnit: "months",
    estimatedMinutes: 5,
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["boiler"],
    seasonalMonths: [],
    healthCategories: [],
    tips: "The gauge is usually on the front of the boiler. If pressure is too low, use the filling loop to add water (consult your manual). If it drops repeatedly, you may have a leak — call a professional.",
    whyItMatters: "Low pressure means poor heating performance. High pressure triggers the safety valve, wasting water and energy. Catching issues early avoids emergency calls.",
    healthMultipliers: {},
    healthRequired: [],
  },
];

const fireplaceTemplates: TaskTemplate[] = [
  {
    id: "fireplace-chimney-sweep",
    name: "Chimney Sweep & Inspection",
    description: "Hire a certified chimney sweep to clean and inspect your chimney, flue, and damper.",
    category: "hvac",
    priority: "safety",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 60,
    estimatedCostLow: 150,
    estimatedCostHigh: 350,
    diyDifficulty: "professional",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: [],
    applicableApplianceCategories: ["fireplace"],
    seasonalMonths: [8, 9],
    healthCategories: ["fire_safety"],
    tips: "Look for a CSIA-certified sweep. They should do a Level 1 inspection at minimum. Schedule in late summer before everyone else does. If you burn more than 2 cords of wood per season, consider twice-yearly cleaning.",
    whyItMatters: "Creosote buildup is the leading cause of chimney fires — over 25,000 per year in the US. An annual sweep costs $200 but prevents fires that cause $50,000+ in damage.",
    healthMultipliers: {},
    healthRequired: [],
  },
  {
    id: "fireplace-check-damper",
    name: "Check Fireplace Damper & Seals",
    description: "Inspect the fireplace damper for proper operation and check door seals or glass gaskets for wear.",
    category: "hvac",
    priority: "efficiency",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 15,
    estimatedCostLow: 0,
    estimatedCostHigh: 50,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: [],
    applicableApplianceCategories: ["fireplace"],
    seasonalMonths: [9, 10],
    healthCategories: [],
    tips: "Open and close the damper fully — it should move freely. Look up the flue with a flashlight for obstructions (bird nests are common). If you have glass doors, check the gasket seal by closing the door on a piece of paper — it should hold firm.",
    whyItMatters: "A stuck-open damper lets heated air escape 24/7 — like leaving a window open. A stuck-closed damper is a carbon monoxide hazard when you light a fire.",
    healthMultipliers: { prioritizeEnergyEfficiency: 1.5 },
    healthRequired: [],
  },
];

const miniSplitTemplates: TaskTemplate[] = [
  {
    id: "mini-split-clean-filters",
    name: "Clean Mini-Split Filters",
    description: "Remove and wash the air filters in each indoor mini-split unit. Let them dry completely before reinstalling.",
    category: "hvac",
    priority: "efficiency",
    frequencyValue: 2,
    frequencyUnit: "weeks",
    estimatedMinutes: 15,
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["mini_split"],
    seasonalMonths: [],
    healthCategories: ["clean_air"],
    tips: "Pop open the front panel, slide out the mesh filters, rinse under warm water, and let air dry. Never run the unit without filters. Most units have a filter indicator light — don't ignore it.",
    whyItMatters: "Mini-splits recirculate room air. Dirty filters mean you're breathing dust and allergens. Clean filters also keep the evaporator coil clean, extending the unit's life.",
    healthMultipliers: { hasAllergies: 2.0, hasPets: 1.5, prioritizeAirQuality: 1.5 },
    healthRequired: [],
  },
  {
    id: "mini-split-professional-service",
    name: "Mini-Split Professional Deep Clean",
    description: "Hire a technician to deep-clean the indoor evaporator coils, check refrigerant levels, and inspect the outdoor unit.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 90,
    estimatedCostLow: 150,
    estimatedCostHigh: 300,
    diyDifficulty: "professional",
    applicableHomeTypes: ALL_HOMES,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["mini_split"],
    seasonalMonths: [3, 4],
    healthCategories: ["clean_air", "mold_prevention"],
    tips: "Mini-split evaporator coils get moldy over time — you'll notice a musty smell when the unit starts. Professional cleaning with a coil cleaner and bib kit is the fix. Ask about mold-prevention coatings.",
    whyItMatters: "Mold growing on evaporator coils blows spores directly into your living space. Professional cleaning prevents respiratory issues and keeps the system efficient.",
    healthMultipliers: { hasAllergies: 1.5, hasImmunocompromised: 2.0 },
    healthRequired: [],
  },
];

const evapCoolerTemplates: TaskTemplate[] = [
  {
    id: "evap-cooler-seasonal-startup",
    name: "Evaporative Cooler Seasonal Start-Up",
    description: "Prepare your swamp cooler for summer: replace pads, clean the reservoir, check the pump and belt, and connect the water line.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 60,
    estimatedCostLow: 20,
    estimatedCostHigh: 80,
    diyDifficulty: "moderate",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["evap_cooler"],
    seasonalMonths: [4, 5],
    healthCategories: [],
    tips: "Replace pads every season — don't reuse them. Check the belt tension (1/2 inch of deflection is ideal). Clean mineral deposits from the reservoir with vinegar. Run the pump for a few minutes before turning on the fan to saturate pads.",
    whyItMatters: "Old pads harbor bacteria and mineral buildup that reduce cooling and can cause odors. A proper start-up ensures your cooler works well all summer.",
    healthMultipliers: {},
    healthRequired: [],
  },
  {
    id: "evap-cooler-winterize",
    name: "Winterize Evaporative Cooler",
    description: "Shut down your evaporative cooler for winter: disconnect water, drain the reservoir, cover the unit, and open the damper to indoor vents.",
    category: "hvac",
    priority: "prevent_damage",
    frequencyValue: 1,
    frequencyUnit: "years",
    estimatedMinutes: 30,
    estimatedCostLow: 10,
    estimatedCostHigh: 40,
    diyDifficulty: "moderate",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: ["hvac"],
    applicableApplianceCategories: ["evap_cooler"],
    seasonalMonths: [10, 11],
    healthCategories: [],
    tips: "Disconnect the water supply and drain the line AND reservoir completely. Standing water freezes and cracks components. Cover the unit with a fitted cover — tarps flap in the wind and trap moisture.",
    whyItMatters: "Frozen water lines and cracked reservoirs are expensive to fix. Ten minutes of winterizing saves $200-500 in spring repairs.",
    healthMultipliers: {},
    healthRequired: [],
  },
];

const solarTemplates: TaskTemplate[] = [
  {
    id: "solar-panel-inspection",
    name: "Inspect Solar Panels",
    description: "Visually inspect solar panels for damage, debris, bird nests, and shading from new tree growth.",
    category: "electrical",
    priority: "efficiency",
    frequencyValue: 6,
    frequencyUnit: "months",
    estimatedMinutes: 20,
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    diyDifficulty: "easy",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: ["solar"],
    applicableApplianceCategories: ["solar_panels"],
    seasonalMonths: [3, 9],
    healthCategories: [],
    tips: "Check your monitoring app for drops in production — that usually means panels need cleaning or something is blocking light. Look for cracked glass, loose wiring, or bird nests under panels. Trim any tree branches that now shade the panels.",
    whyItMatters: "Even partial shading on one panel can reduce the output of an entire string by 30-50%. Regular inspection catches issues before they cost you money.",
    healthMultipliers: { prioritizeEnergyEfficiency: 1.5 },
    healthRequired: [],
  },
  {
    id: "solar-panel-cleaning",
    name: "Clean Solar Panels",
    description: "Clean solar panels with water and a soft brush or squeegee. Avoid abrasive cleaners and high-pressure washers.",
    category: "electrical",
    priority: "efficiency",
    frequencyValue: 6,
    frequencyUnit: "months",
    estimatedMinutes: 45,
    estimatedCostLow: 0,
    estimatedCostHigh: 200,
    diyDifficulty: "moderate",
    applicableHomeTypes: ALL_DETACHED,
    applicableSystems: ["solar"],
    applicableApplianceCategories: ["solar_panels"],
    seasonalMonths: [4, 10],
    healthCategories: [],
    tips: "Clean early morning when panels are cool — spraying cold water on hot panels can crack the glass. Use a garden hose and a soft car-wash brush on an extension pole. In dusty or pollen-heavy areas, clean quarterly. Professional cleaning runs $100-200.",
    whyItMatters: "Dirty panels produce 10-25% less energy. In areas with pollen, dust, or bird activity, the loss can be even higher.",
    healthMultipliers: { prioritizeEnergyEfficiency: 2.0 },
    healthRequired: [],
  },
];
```

- [ ] **Step 3: Register new template arrays in the master export**

Find the array where all templates are combined (near bottom of `templates.ts`). Add the new arrays:

```typescript
  ...heatPumpTemplates,
  ...boilerTemplates,
  ...fireplaceTemplates,
  ...miniSplitTemplates,
  ...evapCoolerTemplates,
  ...solarTemplates,
```

- [ ] **Step 4: Run tests and typecheck**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: All tests PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/templates.ts
git commit -m "feat: add task templates for heat pump, boiler, fireplace, mini-split, evap cooler, solar"
```

---

### Task 4: Redesign Onboarding Step 3 — Major Systems

**Files:**
- Modify: `src/app/onboarding/page.tsx`

This is the core UI change. We replace the old `HOME_ITEM_GROUPS` constant and `StepWhatsInYourHome` component with a new `MAJOR_SYSTEMS` constant and `StepMajorSystems` component.

Key UX behaviors:
- Multi-select within each group
- Selecting "Heat Pump" in Heating auto-selects and greys it out in Cooling
- Inline chip subtypes expand below selected items (Option A from design discussion)
- Subtypes are optional — selecting the parent without a subtype is fine
- Skip link at bottom: "Not sure? No worries, skip ahead"
- Step messaging: "Let's start with your home's major systems — you can always add more later."

- [ ] **Step 1: Replace HOME_ITEM_GROUPS with MAJOR_SYSTEMS**

Find the `HOME_ITEM_GROUPS` constant (around line 149-236) and replace the entire block with:

```typescript
const MAJOR_SYSTEMS: HomeItemGroup[] = [
  {
    label: "Heating",
    items: [
      { key: "furnace", label: "Furnace", icon: "🔥", type: "appliance", mappedAppliance: "furnace" as ApplianceCategory,
        subtypes: [
          { value: "gas", label: "Gas" },
          { value: "electric", label: "Electric" },
          { value: "oil", label: "Oil" },
          { value: "propane", label: "Propane" },
        ],
      },
      { key: "boiler", label: "Boiler", icon: "♨️", type: "appliance", mappedAppliance: "boiler" as ApplianceCategory,
        subtypes: [
          { value: "steam", label: "Steam" },
          { value: "hot-water", label: "Hot Water" },
        ],
      },
      { key: "heat-pump", label: "Heat Pump", icon: "🔄", type: "appliance", mappedAppliance: "heat_pump" as ApplianceCategory },
      { key: "fireplace", label: "Fireplace / Wood Stove", icon: "🪵", type: "appliance", mappedAppliance: "fireplace" as ApplianceCategory },
    ],
  },
  {
    label: "Cooling",
    items: [
      { key: "central-ac", label: "Central AC", icon: "❄️", type: "appliance", mappedAppliance: "ac_unit" as ApplianceCategory },
      { key: "heat-pump-cooling", label: "Heat Pump", icon: "🔄", type: "appliance", mappedAppliance: "heat_pump" as ApplianceCategory },
      { key: "evap-cooler", label: "Evaporative / Swamp Cooler", icon: "💨", type: "appliance", mappedAppliance: "evap_cooler" as ApplianceCategory },
      { key: "mini-split", label: "Mini-Split", icon: "🌬️", type: "appliance", mappedAppliance: "mini_split" as ApplianceCategory },
    ],
  },
  {
    label: "Water",
    items: [
      { key: "water-heater", label: "Water Heater", icon: "🔥", type: "appliance", mappedAppliance: "water_heater" as ApplianceCategory,
        subtypes: [{ value: "tank", label: "Tank" }, { value: "tankless", label: "Tankless" }],
      },
      { key: "water-source", label: "Water Source", icon: "💧", type: "system", mappedSystem: "water_source",
        subtypes: [{ value: "municipal", label: "Municipal" }, { value: "well", label: "Well" }],
      },
      { key: "sewage", label: "Sewer / Septic", icon: "🏗️", type: "system", mappedSystem: "sewage",
        subtypes: [{ value: "sewer", label: "Sewer" }, { value: "septic", label: "Septic" }],
      },
    ],
  },
  {
    label: "Electrical",
    items: [
      { key: "electrical", label: "Electrical Panel", icon: "⚡", type: "system", mappedSystem: "electrical" },
      { key: "generator", label: "Generator", icon: "⚙️", type: "appliance", mappedAppliance: "generator" as ApplianceCategory },
      { key: "solar", label: "Solar Panels", icon: "☀️", type: "system", mappedSystem: "solar" },
    ],
  },
  {
    label: "Structure",
    items: [
      { key: "roofing", label: "Roofing", icon: "🏠", type: "system", mappedSystem: "roofing",
        subtypes: [
          { value: "asphalt-shingle", label: "Asphalt" },
          { value: "metal", label: "Metal" },
          { value: "tile", label: "Tile" },
          { value: "flat", label: "Flat" },
        ],
      },
      { key: "foundation", label: "Foundation", icon: "🧱", type: "system", mappedSystem: "foundation",
        subtypes: [
          { value: "slab", label: "Slab" },
          { value: "crawlspace", label: "Crawlspace" },
          { value: "basement", label: "Basement" },
        ],
      },
    ],
  },
  {
    label: "Outdoor",
    items: [
      { key: "irrigation", label: "Irrigation / Sprinklers", icon: "🌱", type: "system", mappedSystem: "irrigation" },
      { key: "pool", label: "Pool / Hot Tub", icon: "🏊", type: "system", mappedSystem: "pool" },
    ],
  },
];
```

- [ ] **Step 2: Update initialSelectedItems to use MAJOR_SYSTEMS**

Replace the `initialSelectedItems` function (around line 252):

```typescript
function initialSelectedItems(): Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }> {
  const map: Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }> = {};
  for (const group of MAJOR_SYSTEMS) {
    for (const item of group.items) {
      map[item.key] = { enabled: false, subtypes: [], otherSubtype: "" };
    }
  }
  return map;
}
```

- [ ] **Step 3: Replace StepWhatsInYourHome with StepMajorSystems**

Replace the entire `StepWhatsInYourHome` component (around lines 649-790) with:

```typescript
function StepMajorSystems({
  data,
  onChange,
  onNext,
  onBack,
  onSkip,
  currentStep,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
}) {
  const heatPumpSelected = data.selectedItems["heat-pump"]?.enabled;

  const toggleItem = (key: string) => {
    const current = data.selectedItems[key];
    const willEnable = !current.enabled;

    const updates: Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }> = {
      ...data.selectedItems,
      [key]: { ...current, enabled: willEnable },
    };

    // Heat pump sync: selecting in Heating auto-selects in Cooling and vice versa
    if (key === "heat-pump") {
      updates["heat-pump-cooling"] = { enabled: willEnable, subtypes: [], otherSubtype: "" };
    } else if (key === "heat-pump-cooling") {
      updates["heat-pump"] = { enabled: willEnable, subtypes: [], otherSubtype: "" };
    }

    onChange({ selectedItems: updates });
  };

  const toggleSubtype = (itemKey: string, subtype: string) => {
    const current = data.selectedItems[itemKey];
    const subtypes = current.subtypes.includes(subtype)
      ? current.subtypes.filter((v) => v !== subtype)
      : [...current.subtypes, subtype];
    onChange({
      selectedItems: {
        ...data.selectedItems,
        [itemKey]: { ...current, subtypes },
      },
    });
  };

  const selectedCount = Object.values(data.selectedItems).filter((s) => s.enabled).length;

  return (
    <>
      <StepTitle
        title="Your Home's Major Systems"
        subtitle="Let's start with the big stuff — you can always add more details later."
      />

      <div className="flex flex-col gap-6 mb-4">
        {MAJOR_SYSTEMS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)] mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const selection = data.selectedItems[item.key];
                const active = selection?.enabled;

                // Grey out heat-pump-cooling if heat pump already selected in Heating
                const isHeatPumpCoolingMirror = item.key === "heat-pump-cooling" && heatPumpSelected;

                return (
                  <div key={item.key} className="col-span-1 flex flex-col">
                    <button
                      type="button"
                      onClick={() => !isHeatPumpCoolingMirror && toggleItem(item.key)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                        active
                          ? isHeatPumpCoolingMirror
                            ? "border-[var(--color-primary-300)] bg-[var(--color-primary-50)] opacity-60 cursor-default"
                            : "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                          : "border-[var(--color-neutral-200)] bg-white hover:border-[var(--color-neutral-300)]"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#1c1917]">{item.label}</span>
                        {isHeatPumpCoolingMirror && (
                          <span className="text-[10px] text-[var(--color-primary-500)]">Selected above</span>
                        )}
                      </div>
                    </button>
                    {active && !isHeatPumpCoolingMirror && item.subtypes && (
                      <div className="mt-1.5 ml-1 flex flex-wrap items-center gap-1.5">
                        {item.subtypes.map((st) => (
                          <button
                            key={st.value}
                            type="button"
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                              selection.subtypes.includes(st.value)
                                ? "bg-[var(--color-primary-500)] text-white"
                                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]"
                            }`}
                            onClick={() => toggleSubtype(item.key, st.value)}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary pill */}
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-center">
        <span className="text-xs font-medium text-[var(--color-neutral-400)]">
          {selectedCount} system{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <ContinueButton onClick={onNext} />
      <BackButton onClick={onBack} />
      <SkipLink onClick={onSkip} />
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
  );
}
```

- [ ] **Step 4: Update the main page component to render StepMajorSystems**

In the `OnboardingPage` component (around line 1034), replace:

```typescript
        {step === 3 && (
          <StepWhatsInYourHome
```

with:

```typescript
        {step === 3 && (
          <StepMajorSystems
```

Keep the same props (`data`, `onChange`, `onNext`, `onBack`, `onSkip`, `currentStep`).

- [ ] **Step 5: Update buildApiPayload to handle new system types**

In the `buildApiPayload` function (around line 930-967), the logic iterates `HOME_ITEM_GROUPS` to build systems/appliances arrays. Update it to use `MAJOR_SYSTEMS` instead:

Replace all references to `HOME_ITEM_GROUPS` inside `buildApiPayload` with `MAJOR_SYSTEMS`.

Also handle the heat-pump deduplication: if both `heat-pump` and `heat-pump-cooling` are enabled, only emit one `heat_pump` appliance entry (avoid duplicates).

```typescript
  const buildApiPayload = useCallback(() => {
    const systems: { key: string; subtype: string }[] = [];
    const appliances: string[] = [];
    const seenAppliances = new Set<string>();

    for (const group of MAJOR_SYSTEMS) {
      for (const item of group.items) {
        const selection = form.selectedItems[item.key];
        if (!selection?.enabled) continue;

        if (item.type === "system" && item.mappedSystem) {
          const subtype = selection.subtypes[0] ?? "";
          systems.push({ key: item.mappedSystem, subtype });
        }
        if (item.type === "appliance" && item.mappedAppliance) {
          // Deduplicate (heat-pump appears in both Heating and Cooling)
          if (!seenAppliances.has(item.mappedAppliance)) {
            seenAppliances.add(item.mappedAppliance);
            appliances.push(item.mappedAppliance);
          }
        }
      }
    }

    const householdHealth = Object.values(form.healthFlags).some(Boolean) ? form.healthFlags : undefined;

    return { systems, appliances, householdHealth };
  }, [form]);
```

- [ ] **Step 6: Remove the "Anything else we should know?" free-text field**

The old `StepWhatsInYourHome` had an `otherNotes` text field. It's no longer rendered. The `otherNotes` field can stay in the `FormData` type (harmless), or be removed for cleanliness. If removing, also delete from the initial state in `OnboardingPage`:

Remove `otherNotes: ""` from the `useState<FormData>` call and `otherNotes: string` from the `FormData` interface (lines 35-46).

- [ ] **Step 7: Remove unused helper functions**

Delete `getActiveSystemTypes` and `getActiveApplianceCategories` functions (lines 270-292) — they were already unused (lint warnings).

- [ ] **Step 8: Typecheck and verify locally**

```bash
npx tsc --noEmit
```

Expected: PASS.

Open http://localhost:3002/onboarding and walk through the flow:
- Step 1: Welcome → Get Started
- Step 2: About Your Home → fill basics → Continue
- Step 3: Major Systems → verify 6 groups display, tap items, test heat pump sync, verify subtype chips expand
- Step 4: Household → toggle flags → Continue (submit will fail without auth, that's expected)

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS (onboarding page has no unit tests, schemas tests may need the new enum values — check).

- [ ] **Step 10: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: redesign onboarding step 3 — major systems with 6 groups and heat pump sync"
```

---

### Task 5: Update Onboarding API Schema Validation

**Files:**
- Modify: `src/lib/api/schemas.test.ts`

The test file has a test for `onboardingSchema` that sends specific system/appliance values. Update the test data to use the new values.

- [ ] **Step 1: Read the current test**

Check `src/lib/api/schemas.test.ts` for the onboarding test and update any hardcoded system/appliance values to match the new options.

- [ ] **Step 2: Update test data if needed**

If the test sends `systems: [{ key: "hvac", subtype: "forced-air" }]`, that's still valid (hvac is still a valid system type). But verify the test uses values that exist in the updated enum arrays. Add a test case with a new value like `heat_pump`:

```typescript
it("accepts new appliance categories", () => {
  const result = onboardingSchema.parse({
    home: {
      name: "Test Home",
      type: "single_family",
      ownerRole: "i_live_here",
      zip: "12345",
      state: "CA",
      climateZone: "3B",
    },
    systems: [{ key: "solar", subtype: "" }],
    appliances: ["heat_pump", "boiler"],
    taskSetups: [],
  });
  expect(result.appliances).toContain("heat_pump");
  expect(result.systems[0].key).toBe("solar");
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/schemas.test.ts
git commit -m "test: add schema test coverage for new system and appliance types"
```

---

### Task 6: Final Integration Verification

- [ ] **Step 1: Full typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

- [ ] **Step 4: Manual walkthrough on localhost**

1. Open http://localhost:3002/onboarding
2. Walk through all 4 steps
3. Verify heat pump sync (select in Heating → auto-appears in Cooling greyed out)
4. Verify subtype chips expand and collapse
5. Verify skip links work
6. Verify back navigation preserves selections

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final integration fixes for onboarding redesign"
```
