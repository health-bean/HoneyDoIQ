"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Avatar,
  Dialog,
} from "@/components/ui";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const HOME = {
  name: "Main House",
  type: "Single Family",
  yearBuilt: 2004,
  address: "1842 Maple Ridge Dr, Austin, TX 78745",
};

const SYSTEMS: {
  emoji: string;
  name: string;
  subtype: string;
  active: boolean;
}[] = [
  { emoji: "🌡️", name: "HVAC", subtype: "Forced Air", active: true },
  { emoji: "🚿", name: "Plumbing", subtype: "Copper / PEX", active: true },
  { emoji: "⚡", name: "Electrical", subtype: "200 Amp Panel", active: true },
  { emoji: "🏠", name: "Roofing", subtype: "Asphalt Shingle", active: true },
  { emoji: "🧱", name: "Foundation", subtype: "Basement", active: true },
  { emoji: "💧", name: "Water Supply", subtype: "Municipal", active: true },
  { emoji: "🔧", name: "Sewer", subtype: "Municipal", active: true },
  { emoji: "🌱", name: "Irrigation", subtype: "In-Ground Zones", active: true },
  { emoji: "☀️", name: "Solar", subtype: "N/A", active: false },
  { emoji: "🔥", name: "Fireplace", subtype: "N/A", active: false },
];

interface Appliance {
  id: string;
  name: string;
  brand: string;
  model: string;
  room: string;
  warranty: "active" | "expiring" | "expired";
}

const APPLIANCES: Appliance[] = [
  { id: "1", name: "Refrigerator", brand: "Samsung", model: "RF28R7551SR", room: "Kitchen", warranty: "active" },
  { id: "2", name: "Dishwasher", brand: "Bosch", model: "SHPM88Z75N", room: "Kitchen", warranty: "active" },
  { id: "3", name: "Range / Oven", brand: "GE Profile", model: "PGS930", room: "Kitchen", warranty: "expiring" },
  { id: "4", name: "Washing Machine", brand: "LG", model: "WM4000HWA", room: "Laundry", warranty: "active" },
  { id: "5", name: "Dryer", brand: "LG", model: "DLEX4000W", room: "Laundry", warranty: "expired" },
  { id: "6", name: "Water Heater", brand: "Rheem", model: "PROG50-38N", room: "Basement", warranty: "expired" },
];

interface Contractor {
  id: string;
  name: string;
  company: string;
  specialty: string;
  phone: string;
  rating: number;
}

const CONTRACTORS: Contractor[] = [
  { id: "1", name: "Mike Torres", company: "Torres HVAC", specialty: "HVAC", phone: "(512) 555-0147", rating: 5 },
  { id: "2", name: "Lisa Chen", company: "Austin Elite Plumbing", specialty: "Plumbing", phone: "(512) 555-0293", rating: 4 },
  { id: "3", name: "James Okafor", company: "BrightSpark Electric", specialty: "Electrical", phone: "(512) 555-0381", rating: 5 },
];

interface Doc {
  id: string;
  name: string;
  type: "warranty" | "manual" | "receipt";
  date: string;
}

const DOCUMENTS: Doc[] = [
  { id: "1", name: "Samsung Fridge Warranty", type: "warranty", date: "2024-06-15" },
  { id: "2", name: "HVAC System Manual", type: "manual", date: "2024-03-10" },
  { id: "3", name: "Roof Replacement Receipt", type: "receipt", date: "2023-11-22" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function warrantyVariant(status: Appliance["warranty"]) {
  if (status === "active") return "success" as const;
  if (status === "expiring") return "warning" as const;
  return "danger" as const;
}

function warrantyLabel(status: Appliance["warranty"]) {
  if (status === "active") return "Warranty Active";
  if (status === "expiring") return "Expiring Soon";
  return "Warranty Expired";
}

function docTypeVariant(type: Doc["type"]) {
  if (type === "warranty") return "success" as const;
  if (type === "manual") return "info" as const;
  return "warning" as const;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm" aria-label={`${count} out of 5 stars`}>
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Family Members Section (live data)                                 */
/* ------------------------------------------------------------------ */

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

function FamilyMembersSection() {
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
      } else if (data.autoAccepted) {
        setInviteSuccess(`${inviteEmail} has been added to your home!`);
        setInviteEmail("");
        fetchMembers();
      } else {
        setInviteSuccess(`Invite sent! ${inviteEmail} will be added when they sign up.`);
        setInviteEmail("");
        fetchMembers();
      }
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Family Members</h2>
        <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
          + Invite
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar src={m.avatarUrl} fallback={m.name || m.email} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {m.name || m.email}
                </p>
                {m.name && (
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                )}
              </div>
              <Badge variant={m.role === "owner" ? "default" : "info"} size="sm">
                {m.role === "owner" ? "Owner" : "Member"}
              </Badge>
            </CardContent>
          </Card>
        ))}

        {invites.map((inv) => (
          <Card key={inv.id} className="opacity-60">
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar fallback={inv.invitedEmail} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{inv.invitedEmail}</p>
              </div>
              <Badge variant="warning" size="sm">Pending</Badge>
            </CardContent>
          </Card>
        ))}

        {members.length === 0 && invites.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Invite family members to share this home&apos;s maintenance plan.
          </p>
        )}
      </div>

      <Dialog
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
          setInviteError("");
          setInviteSuccess("");
        }}
        title="Invite Family Member"
        description="They'll see the same home, tasks, and can mark things complete."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="family@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteError}
          />
          {inviteSuccess && (
            <p className="text-sm text-[var(--color-success-600)]">{inviteSuccess}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={inviteLoading} disabled={!inviteEmail.trim()}>
              Send Invite
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

export default function HomeProfilePage() {
  const [home] = useState(HOME);

  /* group appliances by room */
  const appliancesByRoom = APPLIANCES.reduce<Record<string, Appliance[]>>((acc, a) => {
    (acc[a.room] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      {/* ---- Home Header ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{home.name}</CardTitle>
                <Badge>{home.type}</Badge>
              </div>
              <CardDescription>
                {home.address} &middot; Built {home.yearBuilt}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ---- Home Systems ---- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Home Systems</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {SYSTEMS.map((s) => (
            <Card
              key={s.name}
              className={
                s.active
                  ? "border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/40 dark:border-[var(--color-primary-800)] dark:bg-[var(--color-primary-950)]/30"
                  : "opacity-45"
              }
            >
              <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.subtype}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Appliances ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Appliances</h2>
          <Button variant="outline" size="sm">
            + Add Appliance
          </Button>
        </div>

        {Object.entries(appliancesByRoom).map(([room, items]) => (
          <div key={room} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{room}</h3>
            <div className="flex flex-col gap-2">
              {items.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{a.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.brand} &middot; {a.model}
                      </span>
                    </div>
                    <Badge variant={warrantyVariant(a.warranty)} size="sm">
                      {warrantyLabel(a.warranty)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ---- Family Members ---- */}
      <FamilyMembersSection />

      {/* ---- Contractors ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Contractors</h2>
          <Button variant="outline" size="sm">
            + Add Contractor
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {CONTRACTORS.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <Badge size="sm">{c.specialty}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.company}</span>
                  <span className="text-xs text-muted-foreground">{c.phone}</span>
                </div>
                <div className="text-amber-500">
                  <Stars count={c.rating} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Documents ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <Button variant="outline" size="sm">
            + Upload Document
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {DOCUMENTS.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {d.type === "warranty" ? "📄" : d.type === "manual" ? "📘" : "🧾"}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{d.date}</span>
                  </div>
                </div>
                <Badge variant={docTypeVariant(d.type)} size="sm">
                  {d.type.charAt(0).toUpperCase() + d.type.slice(1)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
