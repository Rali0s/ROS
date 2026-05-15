/* eslint-disable react/prop-types */
import React from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  Database,
  Fingerprint,
  KeyRound,
  Layers,
  Lock,
  Network,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

const doctrine = {
  research: {
    label: "Research",
    icon: BookOpen,
    subtitle: "Local notes, documents, sources, and synthesis.",
    apps: ["Library", "Research Vault", "Vault Notes", "Bookmarks", "Flow Studio"],
  },
  signal: {
    label: "Signal",
    icon: Radio,
    subtitle: "Communications, network state, wallet records, and exchange.",
    apps: ["ROS Comms", "Nostr Lounge", "LAN Share", "Wallet Vault"],
  },
  utility: {
    label: "Utility",
    icon: TerminalSquare,
    subtitle: "Command capture, scheduling, clocks, inventory, and control.",
    apps: ["Calendar", "World Clocks", "Midnight Console", "Inventory"],
  },
  primary: {
    label: "Primary",
    icon: Fingerprint,
    subtitle: "Operator overview, profiles, case notes, and control surfaces.",
    apps: ["Overview", "Profile Organizer", "BPS Engine", "Control Room"],
  },
};

const productLoop = [
  {
    title: "Create a project",
    copy: "Give the work a home: name, status, summary, root path, and tags.",
  },
  {
    title: "Capture memory",
    copy: "Save notes, file references, command excerpts, research items, and useful model output.",
  },
  {
    title: "Search context",
    copy: "Search active project memory without digging through scattered apps and folders.",
  },
  {
    title: "Ask a local model",
    copy: "Send deterministic project context to an Ollama-ready workflow when a local model is available.",
  },
  {
    title: "Get cited answers",
    copy: "Responses reference memory items by title and id so the operator can trace the evidence.",
  },
  {
    title: "Save the answer",
    copy: "Useful output becomes encrypted project memory instead of another lost chat transcript.",
  },
  {
    title: "Reload and continue",
    copy: "The cockpit returns to the same operational context after lock, reload, or restart.",
  },
];

const coreFeatures = [
  {
    icon: Lock,
    title: "Encrypted operator workspace",
    copy: "ROS stores workspace data locally and keeps it encrypted at rest. Unlocking decrypts it for the current session.",
  },
  {
    icon: Database,
    title: "Persistent project memory",
    copy: "Commands, notes, research, files, and model outputs become searchable project-linked memory.",
  },
  {
    icon: Layers,
    title: "Embedded module surfaces",
    copy: "Primary apps load inside the cockpit, with popout windows available when the operator wants them.",
  },
  {
    icon: BrainCircuit,
    title: "Ollama-ready workflows",
    copy: "Models are the final intelligence layer, not the product. ROS prepares deterministic context for local model runs.",
  },
];

const buyerPain = [
  "Terminal notes live in one place.",
  "AI answers live in another.",
  "Research links disappear into browser tabs.",
  "Project memory resets every time the work moves.",
];

const modules = [
  ["Overview", "Primary"],
  ["Research Vault", "Research"],
  ["Vault Notes", "Memory"],
  ["Library", "Research"],
  ["Profile Organizer", "Primary"],
  ["BPS Engine", "Analysis"],
  ["Terminal", "Utility"],
  ["Calendar", "Utility"],
  ["Wallet Vault", "Signal"],
  ["ROS Comms", "Signal"],
  ["Nostr Lounge", "Signal"],
  ["Control Room", "System"],
];

const pricing = [
  {
    name: "Community",
    price: "$0",
    description: "A basic local cockpit for learning the workflow.",
    points: ["Basic local cockpit", "Manual memory capture", "Basic project search", "Community release channel"],
  },
  {
    name: "Founder Edition",
    price: "$99",
    description: "Early-access license for operators who want the full v2 cockpit now.",
    points: ["Full v2 cockpit", "Ollama context builder", "Founder badge", "Private roadmap access"],
    featured: true,
  },
  {
    name: "Operator Pro",
    price: "$15/mo",
    description: "For operators who want the complete local-first workspace as it expands.",
    points: ["Unlimited projects", "Advanced memory capture", "Backup and export", "Future module packs"],
  },
];

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-semibold tracking-[0.16em] text-slate-300 ${className}`}>
      {children}
    </span>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/48 shadow-2xl shadow-black/30 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function SectionIntro({ eyebrow, title, copy, className = "" }) {
  return (
    <div className={`max-w-3xl ${className}`}>
      <Badge>{eyebrow}</Badge>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-400">{copy}</p>
    </div>
  );
}

function DoctrineNode({ id, active, onSelect }) {
  const item = doctrine[id];
  const Icon = item.icon;

  return (
    <button
      type="button"
      onMouseEnter={() => onSelect(id)}
      onFocus={() => onSelect(id)}
      onClick={() => onSelect(id)}
      className={`group relative grid h-28 w-28 rotate-45 place-items-center border transition duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-100/30 ${
        active
          ? "border-cyan-100/70 bg-cyan-300/[0.075] shadow-[0_0_34px_rgba(103,232,249,0.14)]"
          : "border-white/16 bg-slate-950/42 hover:border-cyan-100/38 hover:bg-white/[0.035]"
      }`}
    >
      <span className="absolute inset-2 border border-white/[0.045]" />
      <span className="-rotate-45 text-center">
        <Icon className="mx-auto mb-2 h-5 w-5 text-cyan-100/80" />
        <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-white">{item.label}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.apps.length} apps</span>
      </span>
    </button>
  );
}

function DoctrineDiamond() {
  const [active, setActive] = React.useState("research");
  const selected = doctrine[active];
  const Icon = selected.icon;

  return (
    <div className="relative mx-auto flex min-h-[34rem] w-full max-w-5xl items-center justify-center py-10">
      <div className="absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/12" />
      <div className="absolute left-1/2 top-1/2 h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/14" />
      <div className="absolute left-1/2 top-[6%] -translate-x-1/2">
        <DoctrineNode id="research" active={active === "research"} onSelect={setActive} />
      </div>
      <div className="absolute right-[13%] top-1/2 -translate-y-1/2">
        <DoctrineNode id="signal" active={active === "signal"} onSelect={setActive} />
      </div>
      <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2">
        <DoctrineNode id="utility" active={active === "utility"} onSelect={setActive} />
      </div>
      <div className="absolute left-[13%] top-1/2 -translate-y-1/2">
        <DoctrineNode id="primary" active={active === "primary"} onSelect={setActive} />
      </div>

      <div className="relative z-10 grid h-52 w-52 rotate-45 place-items-center border border-cyan-100/50 bg-slate-950/52 shadow-[0_0_56px_rgba(103,232,249,0.13)] backdrop-blur-xl">
        <div className="-rotate-45 text-center">
          <KeyRound className="mx-auto mb-4 h-7 w-7 text-cyan-100" />
          <div className="text-xs font-black uppercase tracking-[0.36em] text-white">Unlock Cockpit</div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> local only
          </div>
          <div className="mt-2 text-xs text-slate-500">operator memory ready</div>
        </div>
      </div>

      <GlassCard className="absolute right-0 top-[18%] w-[21rem] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100">{selected.label}</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">{selected.subtitle}</p>
          </div>
          <Icon className="h-5 w-5 shrink-0 text-cyan-100/80" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selected.apps.map((app) => (
            <div key={app} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm font-semibold text-slate-200">
              {app}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/72 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.46em] text-cyan-100/80">ROS</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">OSA-Midnight Oil</h1>
            <Badge>Local only</Badge>
            <Badge className="border-cyan-200/18 bg-cyan-300/[0.055] text-cyan-100">Version 0.2</Badge>
          </div>
        </div>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-400 lg:flex">
          <a href="#workflow" className="transition hover:text-cyan-100">Workflow</a>
          <a href="#trust" className="transition hover:text-cyan-100">Trust</a>
          <a href="#pricing" className="transition hover:text-cyan-100">Founder Edition</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex w-72 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-500">
            <Search className="h-4 w-4" /> Search project memory
          </div>
          <a href="#pricing" className="rounded-2xl bg-cyan-100 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white">
            Founder Edition
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 px-6 py-16 md:py-20">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_38%,rgba(20,184,166,0.16),transparent_31%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(2,6,23,1))]" />
        <div className="absolute left-1/2 top-16 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-cyan-200/5" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.22fr] lg:items-center">
        <div>
          <Badge className="border-cyan-200/20 text-cyan-100">Operator Memory Workspace</Badge>
          <h2 className="mt-6 max-w-2xl text-5xl font-black tracking-tight text-white md:text-6xl">
            One encrypted local cockpit for all operational memory.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            ROS keeps commands, notes, files, research, AI outputs, and project context in one local-first workspace for technical operators.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white">
              Reserve Founder Edition <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#workflow" className="rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.06]">
              See the product loop
            </a>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {["Encrypted", "Local-first", "Ollama-ready", "No cloud required"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
        <DoctrineDiamond />
      </div>
    </section>
  );
}

function PainPromise() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <GlassCard className="p-7">
          <Badge>Primary Pain</Badge>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white">
            Technical work scatters context everywhere.
          </h2>
          <p className="mt-4 text-slate-400">
            The operator knows the answer exists somewhere: terminal history, chat output, notes, PDFs, browser tabs, folders, or screenshots.
          </p>
        </GlassCard>
        <div className="grid gap-3 md:grid-cols-2">
          {buyerPain.map((item) => (
            <GlassCard key={item} className="flex items-center gap-3 p-5">
              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
              <span className="text-sm font-semibold text-slate-300">{item}</span>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Core Product"
          title="The model is not the product. The cockpit is."
          copy="ROS sells encrypted context, persistent memory, local research capture, embedded modules, and Ollama-ready workflows. Models sit on top of that foundation."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {coreFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <GlassCard key={feature.title} className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.07] text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductLoop() {
  return (
    <section id="workflow" className="px-6 py-16">
      <GlassCard className="mx-auto max-w-7xl overflow-hidden p-8">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <Badge className="border-amber-200/20 text-amber-100">Profit MVP</Badge>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">
              The paid workflow is operational memory reuse.
            </h2>
            <p className="mt-4 text-slate-400">
              The first product loop is simple: preserve context, search it, ask a local model against it, and save the useful answer back into memory.
            </p>
          </div>
          <div className="grid gap-3">
            {productLoop.map((step, index) => (
              <div key={step.title} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] text-sm font-black text-cyan-100">
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-white">{step.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">{step.copy}</div>
                </div>
                {index === productLoop.length - 1 ? <Check className="hidden h-4 w-4 text-cyan-200 sm:block" /> : <ArrowRight className="hidden h-4 w-4 text-slate-500 sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function Modules() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionIntro
            eyebrow="Embedded Workspace"
            title="Modules load inside the cockpit."
            copy="The cockpit stays persistent while specialized tools open as embedded Active Module Surfaces. Popouts are optional, not the default product metaphor."
          />
          <a href="#pricing" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.05]">
            Get early access <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(([name, type]) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.04]">
              <div className="text-sm font-bold text-white">{name}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{type}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModelLayer() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
        <GlassCard className="p-7 lg:col-span-2">
          <Badge>Local Intelligence Layer</Badge>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Ollama-ready, not cloud-dependent.</h2>
          <p className="mt-4 max-w-3xl text-slate-400">
            ROS can assemble deterministic project context for local model workflows. It does not need cloud AI to preserve memory, capture research, or operate the cockpit.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Context builder", "Memory citations", "Manual capture fallback"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-bold text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-7">
          <BrainCircuit className="h-8 w-8 text-cyan-100" />
          <h3 className="mt-5 text-xl font-black text-white">DeepNimSec + Citizen-AI</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            DeepNimSec handles defensive risk structure. Citizen-AI handles lab-only cognition training. Both are local model profiles, not cloud services.
          </p>
        </GlassCard>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Monetization"
          title="Founder Edition validates the cockpit before more models."
          copy="Revenue starts with a paid desktop workflow for operators who already feel the pain of scattered project context."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.map((tier) => (
            <GlassCard key={tier.name} className={`p-6 ${tier.featured ? "border-cyan-200/42 bg-cyan-300/[0.06]" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">{tier.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{tier.description}</p>
                </div>
                {tier.featured ? <Sparkles className="h-5 w-5 text-cyan-100" /> : null}
              </div>
              <div className="mt-6 text-4xl font-black text-white">{tier.price}</div>
              <div className="mt-6 space-y-3">
                {tier.points.map((point) => (
                  <div key={point} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="h-4 w-4 shrink-0 text-cyan-200" /> {point}
                  </div>
                ))}
              </div>
              <button className={`mt-8 w-full rounded-2xl px-5 py-3 text-sm font-black transition ${tier.featured ? "bg-cyan-100 text-slate-950 hover:bg-white" : "border border-white/15 text-white hover:bg-white/[0.05]"}`}>
                {tier.featured ? "Reserve Founder License" : "Select Tier"}
              </button>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const trustItems = [
    [Shield, "Encrypted at rest", "Workspace data is stored locally and encrypted when locked."],
    [KeyRound, "Passphrase required", "Unlocking decrypts the workspace for the current session."],
    [Network, "No cloud required", "Core memory capture, search, modules, and storage are local-first."],
    [ShieldCheck, "Literal security posture", "ROS should state what leaves the device and what stays local."],
  ];

  return (
    <section id="trust" className="px-6 py-20">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-slate-950/55 p-8 backdrop-blur-xl">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <Badge className="border-cyan-200/20 text-cyan-100">Trust And Security</Badge>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">
              Local-first security copy should be plain, not theatrical.
            </h2>
            <p className="mt-4 text-slate-400">
              ROS does not need fake system language. The product is stronger when it explains encryption, local storage, unlock behavior, and model boundaries directly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trustItems.map(([Icon, title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-cyan-100" />
                  <span className="font-bold text-white">{title}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 py-16">
      <GlassCard className="mx-auto max-w-7xl p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Badge className="border-amber-200/20 text-amber-100">Founder Edition</Badge>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white">
              Built for operators who need their context back.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-400">
              A private local workspace for technical work, research capture, command memory, and Ollama-ready review loops.
            </p>
          </div>
          <a href="#pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-100 px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-white">
            Reserve Founder License <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </GlassCard>
    </section>
  );
}

export default function ROSLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.13),transparent_34%),radial-gradient(circle_at_10%_30%,rgba(245,158,11,0.07),transparent_22%),linear-gradient(180deg,#020617,#020617_45%,#000)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:64px_64px]" />
      <Header />
      <Hero />
      <PainPromise />
      <FeatureGrid />
      <ProductLoop />
      <Modules />
      <ModelLayer />
      <Pricing />
      <Trust />
      <FinalCta />
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 md:flex-row md:items-center">
          <div className="font-bold text-white">ROS / OSA-Midnight Oil</div>
          <div>Local-first operator memory workspace. Models optional. Context first.</div>
        </div>
      </footer>
    </main>
  );
}
