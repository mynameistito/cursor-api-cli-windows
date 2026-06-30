import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Braces,
  ChevronDown,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  KeyRound,
  Minus,
  PlugZap,
  Plus,
  Server,
  Shield,
  Square,
  Terminal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const releasesUrl =
  "https://github.com/mynameistito/cursor-api-windows/releases";
const localBaseUrl = "http://127.0.0.1:6903/v1";
const installCommand =
  "irm https://cursor-api-windows.mynameistito.com/install.ps1 | iex";

const agentClients = [
  {
    logo: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/opencode.svg",
    name: "OpenCode",
  },
  {
    logo: "https://raw.githubusercontent.com/openai/agents.md/main/public/logos/codex.svg",
    name: "Codex",
  },
  {
    logo: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/pi-coding-agent.svg",
    name: "Pi",
  },
  {
    logo: "https://raw.githubusercontent.com/openai/agents.md/main/public/logos/kilo-code.svg",
    name: "Kilo Code",
  },
  {
    logo: "https://raw.githubusercontent.com/openai/agents.md/main/public/logos/aider.svg",
    name: "Aider",
  },
  {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg",
    name: "VS Code",
  },
] as const;

const highlights = [
  {
    description:
      "Keep each agent pointed at the same localhost URL instead of hand-editing every client when ports or models change.",
    icon: PlugZap,
    title: "One endpoint",
  },
  {
    description:
      "Expose composer-2.5 and composer-2.5-fast through OpenAI-compatible and Anthropic-compatible request shapes.",
    icon: Bot,
    title: "Composer models",
  },
  {
    description:
      "Run the bridge in the background with daemon controls, health checks, logs, and update commands.",
    icon: Server,
    title: "Windows daemon",
  },
  {
    description:
      "Ship cursor-api.exe beside the bundled Node bridge needed for local Cursor SDK calls.",
    icon: Terminal,
    title: "Bundled bridge",
  },
] as const;

const models = [
  [
    "composer-2.5",
    "For deeper agent runs where quality matters more than response speed.",
  ],
  [
    "composer-2.5-fast",
    "For tight edit loops, quick planning passes, and interactive agent sessions.",
  ],
] as const;

const quickStart = [
  installCommand,
  "cursor-api key set",
  "cursor-api start",
  "cursor-api health",
  "cursor-api url",
] as const;

const runtimeTiles = [
  {
    icon: KeyRound,
    title: "API key",
    value: "cursor-local",
  },
  {
    icon: Server,
    title: "Base URL",
    value: localBaseUrl,
  },
  {
    icon: Braces,
    title: "Models",
    value: "composer-2.5 / composer-2.5-fast",
  },
  {
    icon: Shield,
    title: "Encrypted key",
    value: "%APPDATA%\\cursor-api\\api-key.enc",
  },
  {
    icon: Cpu,
    title: "Daemon state",
    value: "%APPDATA%\\cursor-api\\run\\",
  },
  {
    icon: Terminal,
    title: "Logs",
    value: "%APPDATA%\\cursor-api\\logs\\",
  },
] as const;

const CommandLine = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group/line relative flex min-w-0 items-center gap-1.5 rounded-sm py-0.5 pr-9 text-[0.68rem] leading-5 transition hover:bg-white/[0.04]">
      <span className="shrink-0 select-none text-zinc-400">
        PS C:\Users\user&gt;
      </span>
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-zinc-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {value}
      </span>
      <button
        className="absolute right-0 inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#080808] px-2 py-0.5 font-sans text-[0.68rem] font-medium text-zinc-500 opacity-100 transition hover:text-zinc-100 focus-visible:opacity-100 focus-visible:text-zinc-100 sm:opacity-0 sm:group-hover/line:opacity-100"
        onClick={copyValue}
        type="button"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const AgentLogo = ({ logo, name }: { logo: string; name: string }) => (
  <span
    className={`flex size-11 items-center justify-center rounded-lg border border-border shadow-[var(--shadow-card)] ${
      name === "Pi" ? "bg-zinc-950" : "bg-background/90"
    }`}
  >
    <img
      alt={`${name} logo`}
      className={`size-6 object-contain ${
        name === "Pi" || name === "VS Code" ? "" : "dark:invert"
      }`}
      loading="lazy"
      src={logo}
    />
  </span>
);

const AgentCard = ({ logo, name }: (typeof agentClients)[number]) => (
  <article className="group rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--geist-gray-alpha-500)]">
    <div className="mb-5 flex items-start justify-between gap-4">
      <AgentLogo logo={logo} name={name} />
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-medium text-[0.68rem] text-muted-foreground">
        <span className="status-pulse size-1.5 rounded-full bg-[var(--geist-green-700)]" />
        Available
      </span>
    </div>
    <h3 className="m-0 text-base font-semibold tracking-[-0.02em] text-foreground">
      {name}
    </h3>
  </article>
);

const InfoTile = ({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) => (
  <Card className="border-border bg-card transition-colors hover:border-[var(--geist-gray-alpha-500)]">
    <CardContent className="space-y-4 p-5">
      <Icon className="size-5 text-[var(--geist-blue-700)]" />
      <div>
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="m-0 break-words font-mono text-xs leading-5 text-muted-foreground">
          {value}
        </p>
      </div>
      <CheckCircle2 className="size-4 text-[var(--geist-green-700)]" />
    </CardContent>
  </Card>
);

const HeroConsole = () => (
  <div className="relative rise-in [animation-delay:120ms]">
    <Card className="relative overflow-hidden rounded-lg border-border bg-[#080808] py-0 text-zinc-100 shadow-[var(--shadow-card)] dark:bg-[#080808]">
      <div className="border-b border-white/5 bg-[#2b2b2b]">
        <div className="flex h-9 items-stretch justify-between text-sm text-zinc-300">
          <div className="flex min-w-0 items-stretch">
            <div className="flex min-w-0 items-center gap-2 rounded-br-md bg-[#080808] px-2.5 text-zinc-100">
              <span className="flex size-4 items-center justify-center rounded-[3px] border border-[var(--geist-blue-900)] bg-[#111827] text-[0.6rem] text-[var(--geist-blue-900)]">
                &gt;_
              </span>
              <span className="truncate font-sans text-xs font-semibold">
                PowerShell
              </span>
              <X className="ml-8 size-3.5 text-zinc-300" />
            </div>
            <span
              aria-hidden="true"
              className="flex w-11 items-center justify-center border-x border-white/5 text-zinc-300 hover:bg-white/[0.05]"
            >
              <Plus className="size-4" />
            </span>
            <span
              aria-hidden="true"
              className="flex w-9 items-center justify-center text-zinc-300 hover:bg-white/[0.05]"
            >
              <ChevronDown className="size-4" />
            </span>
          </div>
          <div className="hidden items-center sm:flex">
            <span className="flex h-9 w-11 items-center justify-center text-zinc-300">
              <Minus className="size-4" />
            </span>
            <span className="flex h-9 w-11 items-center justify-center text-zinc-300">
              <Square className="size-3" />
            </span>
            <span className="flex h-9 w-11 items-center justify-center text-zinc-300">
              <X className="size-4" />
            </span>
          </div>
        </div>
      </div>
      <CardContent className="space-y-3 p-4 font-mono text-sm leading-6">
        <div className="space-y-0 text-zinc-300">
          <div>PowerShell 7.6.3</div>
          <div>PS C:\Users\user&gt;</div>
        </div>
        <div className="space-y-0 overflow-hidden">
          {quickStart.map((command) => (
            <CommandLine key={command} value={command} />
          ))}
        </div>
        <Separator className="bg-white/10" />
        <div className="grid gap-3 sm:grid-cols-2">
          {models.map(([name, description]) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              key={name}
            >
              <div className="mb-2 flex items-center gap-2 text-zinc-100">
                <Bot className="size-4 text-[var(--geist-blue-700)]" />
                <span>{name}</span>
              </div>
              <p className="m-0 font-sans text-sm leading-6 text-zinc-400">
                {description}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[color-mix(in_oklab,var(--geist-blue-700)_35%,transparent)] bg-[color-mix(in_oklab,var(--geist-blue-700)_12%,transparent)] p-4 text-zinc-400">
          Base URL: <span className="text-zinc-100">{localBaseUrl}</span> · API
          key: <span className="text-zinc-100">cursor-local</span>
        </div>
      </CardContent>
    </Card>
  </div>
);

const App = () => (
  <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-8 sm:pt-12">
    <section className="grid min-h-[calc(100dvh-6rem)] items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="max-w-3xl rise-in">
        <Badge
          className="mb-5 border-[color-mix(in_oklab,var(--geist-blue-700)_32%,var(--border))] bg-background px-3 py-1 font-mono text-xs"
          variant="outline"
        >
          Cursor Composer 2.5 API for Local AI Harnesses
        </Badge>
        <h1 className="mb-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-7xl">
          Put Composer behind every coding agent.
        </h1>
        <p className="mb-7 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
          An unofficial CLI that exposes Cursor Composer 2.5 through one local
          OpenAI-compatible API.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="px-3.5 text-primary-foreground no-underline hover:text-primary-foreground active:translate-y-px"
            size="lg"
          >
            <a href={releasesUrl} rel="noreferrer" target="_blank">
              View Releases
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button
            asChild
            className="bg-background px-3.5 active:translate-y-px"
            size="lg"
            variant="outline"
          >
            <Link to="/docs">Read Docs</Link>
          </Button>
        </div>
      </div>

      <HeroConsole />
    </section>

    <section className="py-14">
      <div className="mb-7 max-w-2xl">
        <h2 className="m-0 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
          Allowed where agents can point at a local API.
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Each supported client can point at the same local OpenAI-compatible
          endpoint.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {agentClients.map((agent) => (
          <AgentCard key={agent.name} {...agent} />
        ))}
      </div>
    </section>

    <section className="grid gap-4 py-12 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        {highlights.map(({ description, icon: Icon, title }) => (
          <Card
            className="group h-full border-border bg-card transition-colors hover:border-[var(--geist-gray-alpha-500)]"
            key={title}
          >
            <CardHeader>
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-[var(--geist-blue-700)]">
                <Icon className="size-4" />
              </div>
              <CardTitle className="text-base tracking-[-0.02em]">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border-[color-mix(in_oklab,var(--geist-blue-700)_26%,var(--border))] bg-[color-mix(in_oklab,var(--geist-blue-700)_8%,var(--card))]">
        <CardContent className="flex h-full flex-col justify-between gap-10 p-6">
          <div className="space-y-4">
            <PlugZap className="size-6 text-[var(--geist-blue-700)]" />
            <h2 className="m-0 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Drop it into the tools you already use.
            </h2>
            <p className="m-0 text-base leading-7 text-muted-foreground">
              Configure your agent client with a local base URL, the literal
              key, and either Composer model name.
            </p>
          </div>
          <Button asChild className="w-fit" variant="outline">
            <Link to="/docs">Open setup guide</Link>
          </Button>
        </CardContent>
      </Card>
    </section>

    <section className="py-10">
      <div className="mb-6 max-w-2xl">
        <h2 className="m-0 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Windows-native control plane.
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Settings live in AppData, the API key is encrypted, and updates
          preserve local configuration.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runtimeTiles.map((tile) => (
          <InfoTile key={tile.title} {...tile} />
        ))}
      </div>
    </section>
  </main>
);

export const Route = createFileRoute("/")({ component: App });
