# Onboarding Redesign — Design Spec

## Problem

The current onboarding has overlapping "Systems" and "Appliances" steps that confuse users. Water heater appears in both plumbing and appliances. The categories use contractor language (HVAC) instead of homeowner language. No health/wellness personalization despite HealthBean branding. Too many required fields block progress.

## Design Principles

1. **Time to value** — users should reach the dashboard fast. Every step after Step 2 is skippable.
2. **Minimal then deepen** — onboarding captures the overview. Home profile page is where users add detail later.
3. **Homeowner language** — "Heating & Cooling" not "HVAC", "Sewer & Septic" not "Sewage"
4. **Health is core** — HealthBean's differentiator. Household health flags adjust task frequency and unlock health-specific tasks.

## Flow

```
Step 1: Welcome (amber gradient)
Step 2: Name + Property Type (required — minimum viable data)
Step 3: What's In Your Home (skippable)
Step 4: Your Household (health/wellness, skippable)
Step 5: Your Maintenance Plan (preview + customize, skippable)
→ Dashboard
```

Every step after Step 2 shows a subtle "Skip, I'll set this up later →" link below the Back button. Not competing with Continue — just a quiet escape hatch.

## Step 1: Welcome

Amber gradient background (matching landing page). House emoji icon, "Let's set up your home" headline, feature icons (Track, Remind, Score), "Takes about 2 minutes", "Get Started" button.

No changes from current implementation.

## Step 2: About Your Home

**Required fields:**
- Home name (text input)
- Property type (2-column compact grid with emoji + label)

**Optional fields:**
- Your role (I live here / I own/manage this)
- Year built, Square footage
- Zip code, State → auto-detects climate zone

Messaging: "We just need the basics — you can add details anytime."

## Step 3: What's In Your Home

**Messaging at top:** "Select what applies — you can always add more from your home profile."

**Single unified list** — no separate systems/appliances distinction. Grouped visually by area:

### Heating & Cooling
- Heating & Cooling (subtypes: Forced Air, Radiant, Mini-Split, Window Units)
- Furnace
- AC Unit

### Water & Plumbing
- Water Heater (subtypes: Tank, Tankless/On-Demand)
- Water Source (subtypes: Municipal, Well)
- Sewer & Septic (subtypes: Sewer, Septic)
- Water Softener
- Sump Pump

### Kitchen
- Refrigerator
- Dishwasher
- Oven / Range
- Microwave
- Garbage Disposal

### Laundry
- Washing Machine
- Dryer

### Structure
- Roofing (subtypes: Asphalt Shingle, Metal, Tile, + "Other" text input for slate etc.)
- Foundation (subtypes: Slab, Crawlspace, Basement)

### Outdoor
- Irrigation / Sprinklers
- Pool / Spa
- Hot Tub
- Generator
- Garage Door

### Safety & Security
- Security System

### Other
- Free text input: "Anything else? e.g., wine cellar, sauna, elevator..."

**UI pattern:** Area headers as small uppercase labels. Items as compact tappable cards (2-column grid). When tapped, subtypes appear as pills below the card. "Other" text input per category that has subtypes (for custom entries like "slate" roofing).

**Data mapping:** Each item maps to either a `SystemType` or `ApplianceCategory` in the existing schema. The frontend handles the friendly grouping; the API receives the same typed data as before.

## Step 4: Your Household

**Messaging:** "This helps us personalize your maintenance plan — you can set this up anytime in settings."

**Checkboxes (multi-select):**
- 🫁 Allergies or asthma in household
- 👶 Young children (under 5)
- 🐾 Pets
- 👴 Elderly family members (65+)
- 🛡️ Immune-compromised family member
- 🌱 Want to prioritize indoor air quality
- ⚡ Want to prioritize energy efficiency

**How it affects tasks:**
- Allergies/asthma → HVAC filter change frequency doubles, add air quality checks, add duct cleaning
- Young children → add cabinet locks check, outlet cover check, water heater temp check
- Pets → more frequent HVAC filter changes, add pet door maintenance
- Elderly → add grab bar checks, non-slip surface checks, accessibility maintenance
- Immune-compromised → add mold inspections, water quality testing, air purifier maintenance
- Air quality → add humidity monitoring, ventilation checks, radon testing
- Energy efficiency → add weatherstripping checks, insulation inspections, energy audit reminders

**Educational content** — NOT shown during onboarding. Attached to individual tasks later as "Why this matters" expandable sections. E.g., on the HVAC filter task: "Homes with pets accumulate dander in filters 2x faster, which can trigger allergies and reduce system efficiency."

## Step 5: Your Maintenance Plan

Same as current but with adjusted frequencies based on household health flags. Shows:
- Summary bar: "X tasks selected"
- Category groups (expandable)
- Each task: toggle on/off, mark as "already done" with date
- Health-adjusted tasks marked with a small health icon to show why frequency differs

**Messaging:** "Here's your personalized plan. Toggle tasks on or off, and mark anything you've already done."

## Skip Behavior

When a user skips Step 3, 4, or 5:
- Step 3 skipped → generate tasks from property type alone (broad defaults)
- Step 4 skipped → standard frequencies (no health adjustments)
- Step 5 skipped → accept all generated tasks as-is
- User lands on dashboard immediately
- A subtle banner on the home profile page: "Finish setting up your home for better recommendations →"

## Schema Changes

### New: household_health_flags table
```
household_health_flags
- id: uuid PK
- home_id: uuid FK → homes (unique)
- has_allergies: boolean default false
- has_young_children: boolean default false
- has_pets: boolean default false
- has_elderly: boolean default false
- has_immunocompromised: boolean default false
- prioritize_air_quality: boolean default false
- prioritize_energy_efficiency: boolean default false
- created_at, updated_at
```

### Onboarding API changes
- Accept new `householdHealth` object in onboarding payload
- Use health flags to adjust `frequencyValue` on generated tasks
- Store flags in new table

### Template system changes
- Add `healthMultipliers` to task templates: e.g., `{ allergies: 0.5, pets: 0.5 }` means frequency is halved (more often) when those flags are set
- Add `healthRequired` to templates: tasks that only appear when specific flags are set (e.g., mold inspection only for immune-compromised)

## Not In Scope
- Educational content UI (Phase 2 — attached to task detail view)
- Equipment detail entry (model number, brand, warranty — done from home profile, not onboarding)
- Photos of equipment
