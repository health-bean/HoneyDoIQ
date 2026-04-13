# Dashboard & Task List Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard health score for new users (placeholder until tasks come due) and restructure the task list page to group tasks by category with collapsible sections.

**Architecture:** Two independent changes: (1) Dashboard API returns `score: null` when no tasks are due yet, dashboard renders a placeholder. (2) Task list page groups tasks by category (HVAC, Safety, etc.) with collapsible sections, keeping filter pills that work across category groups.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Lucide icons

---

### Task 1: Dashboard API — Return null score for new users

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

- [ ] **Step 1: Update API to check if any tasks are due**

In `src/app/api/dashboard/route.ts`, after the tasks query (line ~19), add a check: if no task has `nextDueDate <= today`, return `score: null` instead of computing a score. Replace the score computation block:

```typescript
  // Check if any tasks are due yet (new user has no due tasks)
  const hasTasksDue = tasks.some((t) => t.nextDueDate <= today);

  const score = hasTasksDue
    ? (() => {
        const storedScores = await db
          .select()
          .from(homeHealthScores)
          .where(eq(homeHealthScores.homeId, home.id))
          .orderBy(desc(homeHealthScores.calculatedAt))
          .limit(1);

        return storedScores.length > 0
          ? {
              overall: storedScores[0].score,
              criticalTasks: storedScores[0].criticalTasksScore,
              preventiveCare: storedScores[0].preventiveCareScore,
              homeEfficiency: storedScores[0].homeEfficiencyScore,
            }
          : calculateHomeHealthScore(
              tasks.map((t) => ({
                nextDueDate: new Date(t.nextDueDate),
                priority: t.priority,
                lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
                isActive: t.isActive ?? true,
              }))
            );
      })()
    : null;
```

Note: The above uses an IIFE which is awkward with `await`. Better approach — keep the existing score logic but wrap the result:

```typescript
  const hasTasksDue = tasks.some((t) => t.nextDueDate <= today);

  // Try to read precomputed health score first, fall back to live calculation
  const storedScores = await db
    .select()
    .from(homeHealthScores)
    .where(eq(homeHealthScores.homeId, home.id))
    .orderBy(desc(homeHealthScores.calculatedAt))
    .limit(1);

  const computedScore = storedScores.length > 0
    ? {
        overall: storedScores[0].score,
        criticalTasks: storedScores[0].criticalTasksScore,
        preventiveCare: storedScores[0].preventiveCareScore,
        homeEfficiency: storedScores[0].homeEfficiencyScore,
      }
    : calculateHomeHealthScore(
        tasks.map((t) => ({
          nextDueDate: new Date(t.nextDueDate),
          priority: t.priority,
          lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
          isActive: t.isActive ?? true,
        }))
      );

  // Don't show a score until at least one task has come due
  const score = hasTasksDue ? computedScore : null;
```

- [ ] **Step 2: Verify the build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/route.ts
git commit -m "feat: return null score when no tasks are due yet"
```

---

### Task 2: Dashboard — Placeholder score state for new users

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update DashboardData type to allow null score**

Change the `score` field in `DashboardData` interface at line ~26:

```typescript
interface DashboardData {
  home: { id: string; name: string; type: string } | null;
  score: {
    overall: number;
    criticalTasks: number;
    preventiveCare: number;
    homeEfficiency: number;
  } | null;
  overdue: DashboardTask[];
  upcoming: DashboardTask[];
  totalActive: number;
  userName: string;
}
```

- [ ] **Step 2: Add score placeholder component**

Add this component above the `DashboardPage` function (after the `DashboardSkeleton` component, around line ~144):

```tsx
function ScorePlaceholder() {
  return (
    <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
      <div className="flex items-center gap-5">
        {/* Placeholder ring */}
        <div className="relative shrink-0 h-[100px] w-[100px]">
          <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
            <circle cx={50} cy={50} r={42} fill="none" stroke="#f5f5f4" strokeWidth={8} />
            <circle
              cx={50} cy={50} r={42} fill="none" stroke="#fde68a" strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * 0.75}`}
              className="animate-pulse"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-stone-400">...</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-[15px] font-bold text-stone-900">Your score is building...</p>
          <p className="text-xs text-[var(--color-neutral-400)] leading-relaxed">
            As tasks come due and you complete them, your home health score will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render placeholder or real score conditionally**

In the main return JSX, replace the Health Score Card section (the `<div className="rounded-2xl...">` block starting around line ~271) with a conditional:

```tsx
      {/* ---- Health Score Card ---- */}
      {score ? (
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
          {/* ... existing score ring + category breakdown JSX unchanged ... */}
        </div>
      ) : (
        <ScorePlaceholder />
      )}
```

Move the score-dependent variables (`categories`, `RING_*` constants) inside the score truthy branch, or guard them with `score &&`.

- [ ] **Step 4: Update the empty state for new users**

Replace the existing "All caught up!" empty state (around line ~423) to handle the new-user case:

```tsx
      {needsAttention.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
          <p className="text-sm font-semibold text-stone-900">
            {score ? "All caught up!" : "You're all set for now"}
          </p>
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">
            {score
              ? "No tasks need your attention right now."
              : "We'll let you know when your first tasks are due."}
          </p>
        </div>
      )}
```

- [ ] **Step 5: Verify the build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: show placeholder health score for new users"
```

---

### Task 3: Task list — Category grouping with collapsible sections

**Files:**
- Modify: `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Define category display config**

Replace the existing `categoryLabels` and `categoryBadgeVariant` objects (lines ~106-134) with a unified config:

```typescript
interface CategoryConfig {
  label: string;
  icon: string; // lucide icon name mapped below
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  safety: { label: "Safety & Security", icon: "shield" },
  hvac: { label: "Heating & Cooling", icon: "thermometer" },
  plumbing: { label: "Plumbing & Water", icon: "droplet" },
  electrical: { label: "Electrical", icon: "zap" },
  roof_gutters: { label: "Roof & Gutters", icon: "home" },
  exterior: { label: "Exterior", icon: "trees" },
  windows_doors: { label: "Windows & Doors", icon: "square" },
  appliance: { label: "Appliances", icon: "refrigerator" },
  lawn_landscape: { label: "Lawn & Landscape", icon: "flower2" },
  pest_control: { label: "Pest Control", icon: "bug" },
  garage: { label: "Garage", icon: "warehouse" },
  pool: { label: "Pool & Hot Tub", icon: "waves" },
  cleaning: { label: "Cleaning", icon: "sparkles" },
  seasonal: { label: "Seasonal", icon: "calendar" },
};

function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label || category;
}
```

- [ ] **Step 2: Add imports for Lucide icons**

Update the import at line ~5 to include the category icons:

```typescript
import {
  Plus, ChevronRight, ChevronDown, Check, SkipForward, Clock, Home,
  Shield, Thermometer, Droplet, Zap, Trees, Square, Refrigerator,
  Flower2, Bug, Warehouse, Waves, Sparkles, Calendar,
} from "lucide-react";
```

Add an icon lookup:

```typescript
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  safety: Shield,
  hvac: Thermometer,
  plumbing: Droplet,
  electrical: Zap,
  roof_gutters: Home,
  exterior: Trees,
  windows_doors: Square,
  appliance: Refrigerator,
  lawn_landscape: Flower2,
  pest_control: Bug,
  garage: Warehouse,
  pool: Waves,
  cleaning: Sparkles,
  seasonal: Calendar,
};
```

- [ ] **Step 3: Add collapsed state tracking**

Inside `TasksPage`, add state for tracking which categories are expanded:

```typescript
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

const toggleCategory = useCallback((category: string) => {
  setExpandedCategories((prev) => {
    const next = new Set(prev);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    return next;
  });
}, []);
```

- [ ] **Step 4: Build category-grouped data structure**

Replace the existing `grouped` logic (lines ~300-326) with category grouping:

```typescript
const activeTasks = tasks.filter((t) => t.isActive);
const completedTasks = tasks.filter((t) => !t.isActive);

// Group active tasks by category
const tasksByCategory = activeTasks.reduce<Record<string, Task[]>>((acc, task) => {
  const cat = task.category;
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(task);
  return acc;
}, {});

// Sort tasks within each category by due date (overdue first)
for (const cat of Object.keys(tasksByCategory)) {
  tasksByCategory[cat].sort(byDate);
}

// Sort categories: those with overdue tasks first, then by label
const sortedCategories = Object.keys(tasksByCategory).sort((a, b) => {
  const aHasOverdue = tasksByCategory[a].some((t) => daysBetween(t.nextDueDate, today) < 0);
  const bHasOverdue = tasksByCategory[b].some((t) => daysBetween(t.nextDueDate, today) < 0);
  if (aHasOverdue && !bHasOverdue) return -1;
  if (!aHasOverdue && bHasOverdue) return 1;
  return getCategoryLabel(a).localeCompare(getCategoryLabel(b));
});

// Count overdue across all categories
const overdueCount = activeTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0).length;
const dueSoonCount = activeTasks.filter((t) => {
  const diff = daysBetween(t.nextDueDate, today);
  return diff >= 0 && diff <= 7;
}).length;

const counts: Record<FilterKey, number> = {
  all: activeTasks.length,
  overdue: overdueCount,
  due_soon: dueSoonCount,
  upcoming: activeTasks.length - overdueCount - dueSoonCount,
  completed: completedTasks.length,
};
```

- [ ] **Step 5: Auto-expand categories with urgent tasks on mount**

After the category grouping logic, add an effect to auto-expand categories with overdue or due-soon tasks:

```typescript
// Auto-expand categories with overdue or due-this-week tasks on first load
useEffect(() => {
  if (activeTasks.length === 0) return;
  const urgent = new Set<string>();
  for (const task of activeTasks) {
    const diff = daysBetween(task.nextDueDate, today);
    if (diff <= 7) urgent.add(task.category);
  }
  setExpandedCategories(urgent);
  // Only run on first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tasks.length > 0]);
```

- [ ] **Step 6: Write the category section renderer**

Replace `renderGroup` with a new `renderCategorySection`:

```tsx
function renderCategorySection(category: string, categoryTasks: Task[]) {
  const config = CATEGORY_CONFIG[category];
  const label = config?.label || category;
  const IconComponent = CATEGORY_ICONS[category] || Home;
  const isExpanded = expandedCategories.has(category);
  const overdueInCategory = categoryTasks.filter(
    (t) => daysBetween(t.nextDueDate, today) < 0
  ).length;
  const dueSoonInCategory = categoryTasks.filter((t) => {
    const diff = daysBetween(t.nextDueDate, today);
    return diff >= 0 && diff <= 7;
  }).length;

  // Apply filter
  let visibleTasks = categoryTasks;
  if (filter === "overdue") {
    visibleTasks = categoryTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0);
  } else if (filter === "due_soon") {
    visibleTasks = categoryTasks.filter((t) => {
      const diff = daysBetween(t.nextDueDate, today);
      return diff >= 0 && diff <= 7;
    });
  } else if (filter === "upcoming") {
    visibleTasks = categoryTasks.filter((t) => daysBetween(t.nextDueDate, today) > 7);
  }

  if (visibleTasks.length === 0) return null;

  return (
    <section key={category} className="mb-4">
      <button
        onClick={() => toggleCategory(category)}
        className="w-full flex items-center gap-2.5 px-1 py-2 group"
      >
        <IconComponent className="w-4 h-4 text-[var(--color-neutral-400)] shrink-0" />
        <span className="text-[13px] font-bold text-stone-900 flex-1 text-left">
          {label}
        </span>
        {overdueInCategory > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
            {overdueInCategory} overdue
          </span>
        )}
        {overdueInCategory === 0 && dueSoonInCategory > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            {dueSoonInCategory} due soon
          </span>
        )}
        <span className="text-[11px] text-[var(--color-neutral-400)]">
          {visibleTasks.length}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--color-neutral-300)] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--color-neutral-300)] shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-2 mt-1">
          {visibleTasks.map((task) => {
            const statusGroup = getStatusGroup(task, today);
            return renderTaskRow(task, statusGroup);
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Update the main JSX to use category groups**

Replace the task groups section (lines ~627-669) with:

```tsx
      {/* Task groups by category */}
      <div>
        {filter !== "completed" && sortedCategories.map((cat) =>
          renderCategorySection(cat, tasksByCategory[cat])
        )}

        {filter === "completed" && completedTasks.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-2.5 text-green-600">
              Completed
              <span className="ml-1.5 text-[11px] font-normal opacity-60">
                ({completedTasks.length})
              </span>
            </h2>
            <div className="flex flex-col gap-2">
              {completedTasks.sort(byDate).map((task) => renderTaskRow(task, "completed"))}
            </div>
          </section>
        )}

        {/* Empty states for filtered views */}
        {filter === "overdue" && overdueCount === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="No overdue tasks"
            description="You're all caught up! No tasks are past due."
          />
        )}
        {filter === "due_soon" && dueSoonCount === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="Nothing due soon"
            description="No tasks are due in the next 7 days."
          />
        )}
        {filter === "completed" && completedTasks.length === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="No completed tasks"
            description="You haven't completed any tasks yet."
          />
        )}
      </div>
```

- [ ] **Step 8: Update categoryLabels references in task detail dialog**

The task detail dialog and `renderTaskRow` use `categoryLabels[task.category]`. Update these to use `getCategoryLabel(task.category)` instead. In `renderTaskRow` (line ~374):

```tsx
<p className="text-xs text-[var(--color-neutral-400)] mt-0.5 truncate">
  {getCategoryLabel(task.category)} &middot; {priLabel} &middot;{" "}
  <span className={due.color}>{due.text}</span>
</p>
```

In the task detail dialog badges section (around line ~692):

```tsx
<Badge variant={categoryBadgeVariant[selectedTask.category] || "default"} size="md">
  {getCategoryLabel(selectedTask.category)}
</Badge>
```

And in the details grid (around line ~730):

```tsx
<p className="text-sm font-medium text-foreground">
  {getCategoryLabel(selectedTask.category)}
</p>
```

- [ ] **Step 9: Remove the "upcoming" filter option**

With category grouping, "upcoming" as a filter is less useful — tasks beyond 7 days are already visible in their category sections. Remove it from `filterOptions`:

```typescript
const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due Soon" },
  { key: "completed", label: "Completed" },
];
```

Update `FilterKey` type:

```typescript
type FilterKey = "all" | "overdue" | "due_soon" | "completed";
```

Remove `StatusGroup` type (no longer needed for grouping, but still used in `renderTaskRow` for strip colors). Keep it but rename for clarity:

```typescript
type TaskUrgency = "overdue" | "due_soon" | "upcoming";
```

- [ ] **Step 10: Verify the build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add src/app/(app)/tasks/page.tsx
git commit -m "feat: group tasks by category with collapsible sections"
```

---

### Task 4: Final verification and push

**Files:** None (testing only)

- [ ] **Step 1: Run full type check and tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: No type errors, all tests pass

- [ ] **Step 2: Push to remote**

```bash
git push
```

- [ ] **Step 3: Verify deployment**

Check Vercel deploys and test both pages on the live site:
1. Dashboard — new user should see "Your score is building..." placeholder
2. Task list — tasks grouped by category with collapsible sections
3. Filter pills still work across category groups
