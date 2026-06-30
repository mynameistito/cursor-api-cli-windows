import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const installCommand =
  "irm https://cursor-api-windows.mynameistito.com/install.ps1 | iex";

const setupSteps = [
  ["Install", installCommand],
  ["Save your Cursor key", "cursor-api key set"],
  ["Start the daemon", "cursor-api start"],
  ["Verify the server", "cursor-api health"],
  ["Copy the base URL", "cursor-api url"],
] as const;

const commandGroups = {
  Config: [
    "cursor-api key set",
    "cursor-api key status",
    "cursor-api port show",
    "cursor-api port set <port>",
    "cursor-api configure agent opencode",
  ],
  Ops: [
    "cursor-api health",
    "cursor-api url",
    "cursor-api update check",
    "cursor-api update install",
  ],
  Server: [
    "cursor-api start",
    "cursor-api stop",
    "cursor-api restart",
    "cursor-api status",
    "cursor-api logs -f",
  ],
} as const;

const endpointRows = [
  ["GET", "/v1/models", "List composer-2.5 and composer-2.5-fast."],
  ["POST", "/v1/chat/completions", "OpenAI chat completions."],
  ["POST", "/v1/responses", "OpenAI Responses API shape."],
  [
    "POST",
    "/v1/messages",
    "Anthropic Messages shape for Claude Code-style clients.",
  ],
  ["POST", "/v1/messages/count_tokens", "Anthropic token counting shape."],
] as const;

const clientRows = [
  ["Base URL", "http://127.0.0.1:6903/v1"],
  ["API key", "cursor-local"],
  ["Primary model", "composer-2.5"],
  ["Fast model", "composer-2.5-fast"],
  ["Bind address", "127.0.0.1"],
  ["Default port", "6903"],
] as const;

const agentSetupRows = [
  {
    description:
      "Use the bundled configurator. It writes the local OpenAI-compatible provider into OpenCode so future sessions can select the Composer model directly.",
    name: "OpenCode",
    notes: [
      "Run the command after the daemon is started at least once.",
      "Re-run it any time you change the daemon port.",
      "Keep the generated provider pointed at /v1; do not remove that suffix.",
    ],
    settings: [
      ["Provider", "OpenAI-compatible local provider"],
      ["Base URL", "http://127.0.0.1:6903/v1"],
      ["API key", "cursor-local"],
      ["Models", "composer-2.5, composer-2.5-fast"],
    ],
    steps: [
      ["Start the daemon", "cursor-api start"],
      ["Write OpenCode config", "cursor-api configure agent opencode"],
      ["Check the endpoint", "cursor-api health"],
      [
        "Use the model",
        "Select composer-2.5-fast for quick edits or composer-2.5 for deeper runs.",
      ],
    ],
  },
  {
    description:
      "Configure Codex as a custom OpenAI-compatible provider when your Codex client exposes provider, base URL, API key, and model fields.",
    name: "Codex",
    notes: [
      "Use the OpenAI-compatible provider path, not Anthropic settings.",
      "The API key is a local placeholder used by clients that require a key field.",
      "If Codex shows connection errors, verify the daemon URL with cursor-api url.",
    ],
    settings: [
      ["Provider type", "OpenAI compatible"],
      ["Base URL", "http://127.0.0.1:6903/v1"],
      ["API key", "cursor-local"],
      ["Default model", "composer-2.5-fast"],
    ],
    steps: [
      [
        "Open provider settings",
        "Create or edit a custom OpenAI-compatible provider.",
      ],
      ["Set the base URL", "http://127.0.0.1:6903/v1"],
      ["Set the key", "cursor-local"],
      ["Set the model", "composer-2.5-fast"],
      [
        "Validate",
        "Send a short prompt after cursor-api health returns healthy.",
      ],
    ],
  },
  {
    description:
      "Point Pi at the localhost OpenAI-compatible endpoint and keep the fast Composer model as the default for interactive coding sessions.",
    name: "Pi",
    notes: [
      "Pi should target the local daemon, not the public OpenAI API.",
      "Use composer-2.5 when you want slower, more complete planning.",
      "Restart Pi after changing provider settings if it caches the connection.",
    ],
    settings: [
      ["Provider", "Custom OpenAI-compatible"],
      ["Base URL", "http://127.0.0.1:6903/v1"],
      ["API key", "cursor-local"],
      ["Model", "composer-2.5-fast"],
    ],
    steps: [
      [
        "Open model settings",
        "Choose the custom provider or OpenAI-compatible option.",
      ],
      ["Paste endpoint", "http://127.0.0.1:6903/v1"],
      ["Paste key", "cursor-local"],
      ["Choose model", "composer-2.5-fast"],
      ["Troubleshoot", "Run cursor-api logs -f while sending a Pi request."],
    ],
  },
  {
    description:
      "Create a Kilo Code provider profile that routes OpenAI-compatible chat requests through the local daemon.",
    name: "Kilo Code",
    notes: [
      "Keep streaming enabled if Kilo Code offers a streaming toggle.",
      "Use chat completions or OpenAI-compatible mode.",
      "If model discovery is not automatic, enter both Composer model names manually.",
    ],
    settings: [
      ["Provider", "OpenAI compatible"],
      ["Base URL", "http://127.0.0.1:6903/v1"],
      ["API key", "cursor-local"],
      ["Fast model", "composer-2.5-fast"],
      ["Full model", "composer-2.5"],
    ],
    steps: [
      [
        "Create provider",
        "Add a custom OpenAI-compatible provider in Kilo Code.",
      ],
      ["Configure endpoint", "http://127.0.0.1:6903/v1"],
      ["Configure key", "cursor-local"],
      ["Add models", "composer-2.5-fast and composer-2.5"],
      ["Confirm", "Run cursor-api status before starting an agent task."],
    ],
  },
  {
    description:
      "Save Aider defaults so each run uses the local daemon without repeating base URL and model flags.",
    name: "Aider",
    notes: [
      "Aider expects OpenAI-compatible names for the base URL and key.",
      "Use the fast model for patch loops and the full model for broad refactors.",
      "If you prefer one-off runs, pass the same values as environment variables or CLI flags.",
    ],
    settings: [
      ["OpenAI base URL", "http://127.0.0.1:6903/v1"],
      ["OpenAI API key", "cursor-local"],
      ["Default model", "composer-2.5-fast"],
      ["Alternative model", "composer-2.5"],
    ],
    steps: [
      ["Start daemon", "cursor-api start"],
      ["Set base URL", "http://127.0.0.1:6903/v1"],
      ["Set API key", "cursor-local"],
      ["Set default model", "composer-2.5-fast"],
      ["Verify", "Ask Aider for a small repository summary."],
    ],
  },
  {
    description:
      "Use these values in any VS Code extension that lets you define a custom OpenAI-compatible endpoint.",
    name: "VS Code",
    notes: [
      "Different extensions name the same fields differently; match by meaning.",
      "The base URL must include /v1 for OpenAI-compatible extensions.",
      "Use cursor-api logs -f when an extension hides provider errors.",
    ],
    settings: [
      ["Provider type", "OpenAI compatible"],
      ["Base URL", "http://127.0.0.1:6903/v1"],
      ["API key", "cursor-local"],
      ["Model", "composer-2.5-fast"],
    ],
    steps: [
      ["Open extension settings", "Find provider, model, or API settings."],
      ["Choose custom provider", "Select OpenAI-compatible if available."],
      ["Save endpoint", "http://127.0.0.1:6903/v1"],
      ["Save key", "cursor-local"],
      [
        "Test request",
        "Use the extension while cursor-api logs -f is running.",
      ],
    ],
  },
] as const;

const lifecycleRows = [
  ["Install location", "%LOCALAPPDATA%\\Programs\\cursor-api\\"],
  ["Runtime layout", "cursor-api.exe plus a bundled bridge directory"],
  ["Server process", "Background daemon with PID state under AppData"],
  ["Bridge process", "Node runtime for local @cursor/sdk calls"],
  ["Updates", "Stop daemon, replace release files, preserve AppData config"],
] as const;

const troubleshootingRows = [
  [
    "401 or auth errors",
    "Run cursor-api key status, then cursor-api key set if needed.",
  ],
  [
    "Client cannot connect",
    "Run cursor-api status and confirm the client uses /v1 in the base URL.",
  ],
  ["Port conflict", "Use cursor-api port set <port>, then restart the daemon."],
  ["Need logs", "Run cursor-api logs -f while reproducing the client request."],
  [
    "Agent config drift",
    "Re-run cursor-api configure agent opencode after changing the port.",
  ],
] as const;

const storageRows = [
  ["Install", "%LOCALAPPDATA%\\Programs\\cursor-api\\"],
  ["Settings", "%APPDATA%\\cursor-api\\settings.json"],
  ["Encrypted key", "%APPDATA%\\cursor-api\\api-key.enc"],
  ["PID / state", "%APPDATA%\\cursor-api\\run\\"],
  ["Logs", "%APPDATA%\\cursor-api\\logs\\"],
] as const;

const creditRows = [
  [
    "standardagents/composer-api",
    "OpenAI-compatible translation, Cursor API adapters, the local bridge, and the sidecar server design.",
  ],
  [
    "API for Cursor Windows port",
    "Two-process architecture, bridge runtime constraints, agent config shapes, and local defaults.",
  ],
  [
    "@cursor/sdk",
    "Official Cursor SDK used by the bundled Node bridge to drive Composer agents.",
  ],
  [
    "Cursor Composer models",
    "Model names and capabilities are provided by Cursor. This project is independent.",
  ],
] as const;

const docsNav = [
  ["Overview", "#overview"],
  ["Client settings", "#client-settings"],
  ["Quick start", "#quick-start"],
  ["Agent setup", "#agent-setup"],
  ["Requests", "#requests"],
  ["API surface", "#api-surface"],
  ["Runtime", "#runtime"],
  ["Troubleshooting", "#troubleshooting"],
  ["Commands", "#commands"],
  ["Storage", "#storage"],
  ["Credits", "#credits"],
] as const;

const rightRailLinks = [
  ["Install", "#quick-start"],
  ["Configure agents", "#agent-setup"],
  ["Send requests", "#requests"],
  ["Debug", "#troubleshooting"],
] as const;

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const isMountedRef = useRef(true);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      if (!isMountedRef.current) {
        return;
      }
      setCopied(true);
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1600);
    } catch {
      if (!isMountedRef.current) {
        return;
      }
      setCopied(false);
    }
  };

  return (
    <button
      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-medium text-[0.68rem] text-muted-foreground opacity-100 shadow-[var(--shadow-card)] transition hover:text-foreground focus-visible:shadow-[var(--focus-ring)] sm:opacity-0 sm:group-hover:opacity-100"
      onClick={copyValue}
      type="button"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const CodeBlock = ({
  className = "",
  value,
}: {
  className?: string;
  value: string;
}) => (
  <div className="group relative">
    <CopyButton value={value} />
    <pre
      className={`overflow-x-auto rounded-lg border border-border bg-[var(--geist-gray-alpha-100)] p-4 pr-20 font-mono text-xs leading-6 text-foreground ${className}`}
    >
      <code>{value}</code>
    </pre>
  </div>
);

const RequestExampleCard = ({
  children,
  title,
  value,
}: {
  children: React.ReactNode;
  title: string;
  value: string;
}) => (
  <div className="flex h-full flex-col text-sm leading-7 text-muted-foreground">
    <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
    <div className="mb-5 min-h-20">{children}</div>
    <div className="mt-auto">
      <CodeBlock className="min-h-[21rem]" value={value} />
    </div>
  </div>
);

const Step = ({ label, command }: { label: string; command: string }) => (
  <div className="rounded-lg border border-border bg-background p-3 shadow-[var(--shadow-card)]">
    <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
    <CodeBlock value={command} />
  </div>
);

const AvailablePill = () => (
  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[var(--geist-green-100)] px-2 py-1 font-medium text-[0.68rem] text-[var(--geist-green-700)]">
    <span className="status-pulse size-1.5 rounded-full bg-[var(--geist-green-700)]" />
    Available
  </span>
);

const AgentSetupCard = ({
  description,
  name,
  notes,
  settings,
  steps,
}: (typeof agentSetupRows)[number]) => (
  <div className="rounded-xl border border-border bg-background shadow-[var(--shadow-card)]">
    <div className="border-b border-border p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold tracking-[-0.025em] text-foreground">
          {name}
        </h3>
        <AvailablePill />
      </div>
      <p className="m-0 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>

    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(17rem,0.95fr)]">
      <div className="border-b border-border p-4 sm:p-5 lg:border-r lg:border-b-0">
        <div className="mb-3 font-medium text-foreground text-sm">
          Setup steps
        </div>
        <ol className="m-0 space-y-3 p-0">
          {steps.map(([label, value], index) => (
            <li className="grid grid-cols-[1.75rem_1fr] gap-3" key={label}>
              <span className="flex size-7 items-center justify-center rounded-full border border-border bg-[var(--geist-gray-alpha-100)] font-mono text-[0.7rem] text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="mb-1 text-sm font-medium text-foreground">
                  {label}
                </div>
                {value.startsWith("cursor-api") || value.startsWith("http") ? (
                  <CodeBlock value={value} />
                ) : (
                  <p className="m-0 text-sm leading-6 text-muted-foreground">
                    {value}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 font-medium text-foreground text-sm">
          Required settings
        </div>
        <div className="mb-5 rounded-lg border border-border bg-[var(--geist-gray-alpha-100)]">
          {settings.map(([label, value]) => (
            <div
              className="grid gap-1 border-b border-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[8rem_1fr]"
              key={label}
            >
              <span className="text-muted-foreground text-xs leading-5">
                {label}
              </span>
              <code className="break-all border-0 bg-transparent p-0 font-mono text-xs leading-5 text-foreground">
                {value}
              </code>
            </div>
          ))}
        </div>

        <div className="mb-3 font-medium text-foreground text-sm">Notes</div>
        <ul className="m-0 space-y-2 p-0">
          {notes.map((note) => (
            <li
              className="grid grid-cols-[0.75rem_1fr] gap-2 text-sm leading-6 text-muted-foreground"
              key={note}
            >
              <span className="mt-2 size-1.5 rounded-full bg-[var(--geist-blue-700)]" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const DocsRail = () => (
  <aside className="hidden xl:block">
    <div className="sticky top-24 space-y-5">
      <div className="rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)]">
        <p className="mb-3 font-medium text-foreground text-sm">On this page</p>
        <nav className="space-y-1 text-sm">
          {rightRailLinks.map(([label, href]) => (
            <a
              className="block rounded-md px-2 py-1.5 text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-[color-mix(in_oklab,var(--geist-blue-700)_24%,var(--border))] bg-[color-mix(in_oklab,var(--geist-blue-700)_7%,var(--background))] p-4 text-sm leading-6 text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Local defaults</p>
        <div className="space-y-2">
          <div>
            <span className="block text-xs text-muted-foreground">
              Base URL
            </span>
            <code className="break-all font-mono text-xs">
              http://127.0.0.1:6903/v1
            </code>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">API key</span>
            <code className="font-mono text-xs">cursor-local</code>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Fast model
            </span>
            <code className="font-mono text-xs">composer-2.5-fast</code>
          </div>
        </div>
      </div>
    </div>
  </aside>
);

const DocsSidebar = () => (
  <aside className="hidden lg:block">
    <nav className="sticky top-24 space-y-1 text-sm">
      <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Docs
      </p>
      {docsNav.map(([label, href]) => (
        <a
          className="block rounded-md px-2 py-1.5 text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
          href={href}
          key={href}
        >
          {label}
        </a>
      ))}
    </nav>
  </aside>
);

const DocsIntroCard = () => (
  <div className="rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="m-0 text-base font-semibold tracking-[-0.02em] text-foreground">
        Quick reference
      </h3>
      <AvailablePill />
    </div>
    <div className="space-y-3">
      {clientRows.slice(0, 4).map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 text-muted-foreground text-xs">{label}</div>
          <code className="break-all font-mono text-xs leading-5">{value}</code>
        </div>
      ))}
    </div>
  </div>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
    <div className="text-sm font-medium text-foreground">{label}</div>
    <code className="break-all font-mono text-xs leading-6 text-muted-foreground">
      {value}
    </code>
  </div>
);

const SectionHeading = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => (
  <div className="mb-5">
    <h2 className="mb-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
      {title}
    </h2>
    <p className="m-0 max-w-2xl text-sm leading-7 text-muted-foreground">
      {description}
    </p>
  </div>
);

const Docs = () => (
  <main className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-6 lg:py-12 xl:grid-cols-[13rem_minmax(0,56rem)_17rem]">
    <DocsSidebar />

    <article className="min-w-0">
      <section className="border-b border-border pb-8" id="overview">
        <Badge
          variant="outline"
          className="mb-4 bg-background px-2.5 py-1 font-mono text-xs"
        >
          Documentation
        </Badge>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          cursor-api docs
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
          Run a local Windows daemon that exposes Cursor Composer through
          OpenAI-compatible and Anthropic-compatible API shapes for agent
          clients.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] sm:p-5">
            <p className="m-0 text-sm leading-7 text-muted-foreground">
              The daemon binds to loopback, keeps your Cursor key encrypted
              under AppData, and translates common agent client requests through
              the bundled Cursor SDK bridge.
            </p>
          </div>
          <DocsIntroCard />
        </div>
      </section>

      <section className="border-b border-border py-8" id="client-settings">
        <SectionHeading
          description="Use these values in agent clients that support a custom local API endpoint."
          title="Client settings"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {clientRows.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-8" id="quick-start">
        <SectionHeading
          description="Install the release bundle, store your Cursor key, then start the local daemon."
          title="Quick start"
        />
        <div className="space-y-3">
          {setupSteps.map(([label, command], index) => (
            <Step
              command={command}
              key={label}
              label={`${index + 1}. ${label}`}
            />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-8" id="agent-setup">
        <SectionHeading
          description="Each setup below includes the fields to save, the order to configure them, and the checks to run when a client hides connection errors."
          title="Agent setup"
        />
        <div className="mb-5 rounded-lg border border-[color-mix(in_oklab,var(--geist-blue-700)_24%,var(--border))] bg-[color-mix(in_oklab,var(--geist-blue-700)_7%,var(--background))] p-4 text-sm leading-6 text-muted-foreground">
          These values are for agent configuration, not for a one-off prompt.
          Use <code>cursor-local</code> as the API key and choose either
          Composer model in the client settings.
        </div>
        <div className="grid gap-5">
          {agentSetupRows.map((agent) => (
            <AgentSetupCard key={agent.name} {...agent} />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-8" id="requests">
        <SectionHeading
          description="The server accepts common agent request shapes and translates them through the same Composer path."
          title="Request examples"
        />
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <RequestExampleCard
            title="OpenAI-compatible"
            value={`POST http://127.0.0.1:6903/v1/chat/completions
Authorization: Bearer cursor-local
Content-Type: application/json

{
  "model": "composer-2.5-fast",
  "messages": [
    { "role": "user", "content": "Inspect this repo and suggest a fix." }
  ],
  "stream": true
}`}
          >
            <p>
              Use the same shape most OpenAI-compatible agents already emit. Set{" "}
              <code>stream</code> when your client expects server-sent events.
            </p>
          </RequestExampleCard>

          <RequestExampleCard
            title="Anthropic-compatible"
            value={`POST http://127.0.0.1:6903/v1/messages
x-api-key: cursor-local
anthropic-version: 2023-06-01
Content-Type: application/json

{
  "model": "composer-2.5",
  "max_tokens": 1200,
  "messages": [
    { "role": "user", "content": "Plan the next edit." }
  ]
}`}
          >
            <p>
              The local server also accepts the Anthropic Messages shape for
              Claude Code-style clients and translates it through the same
              Composer path.
            </p>
          </RequestExampleCard>
        </div>
      </section>

      <section className="border-b border-border py-8" id="api-surface">
        <SectionHeading
          description="The daemon binds to loopback and exposes only the local /v1 surface."
          title="API surface"
        />
        <div className="space-y-3">
          {endpointRows.map(([method, path, description]) => (
            <div
              className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[5rem_minmax(16rem,18rem)_1fr]"
              key={path}
            >
              <span className="font-mono text-xs font-semibold text-[var(--geist-blue-700)]">
                {method}
              </span>
              <code className="w-fit max-w-full overflow-x-auto whitespace-nowrap font-mono text-xs">
                {path}
              </code>
              <span className="text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground">
          <h3 className="text-base font-semibold text-foreground">
            Model choice
          </h3>
          <p>
            Use <code>composer-2.5</code> when an agent needs a more thorough
            planning or editing pass.
          </p>
          <Separator />
          <p>
            Use <code>composer-2.5-fast</code> when you want quicker turn-taking
            for iterative agent work.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-8" id="runtime">
        <SectionHeading
          description="The release bundle keeps the Bun-compiled CLI and Node bridge separate."
          title="Runtime lifecycle"
        />
        <div className="space-y-2">
          {lifecycleRows.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-8" id="troubleshooting">
        <SectionHeading
          description="Use these checks before changing client configuration or reinstalling."
          title="Troubleshooting"
        />
        <div className="space-y-2">
          {troubleshootingRows.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="border-b border-border py-8" id="commands">
        <SectionHeading
          description="The CLI command surface is grouped by daemon control, configuration, and operations."
          title="Command reference"
        />
        <Tabs defaultValue="Server">
          <TabsList className="mb-5 grid w-full grid-cols-3">
            {Object.keys(commandGroups).map((group) => (
              <TabsTrigger key={group} value={group}>
                {group}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(commandGroups).map(([group, commands]) => (
            <TabsContent key={group} value={group}>
              <div className="grid gap-2">
                {commands.map((command) => (
                  <code
                    className="block rounded-lg border border-border bg-[var(--geist-gray-alpha-100)] px-3 py-2 font-mono text-sm"
                    key={command}
                  >
                    {command}
                  </code>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="border-b border-border py-8" id="storage">
        <SectionHeading
          description="User configuration lives under AppData and is preserved across release updates."
          title="Where data lives"
        />
        <div className="space-y-2">
          {storageRows.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="py-8" id="credits">
        <SectionHeading
          description="cursor-api-windows is independent and builds on prior MIT work."
          title="Credits and scope"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {creditRows.map(([name, description]) => (
            <div
              className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]"
              key={name}
            >
              <h3 className="mb-2 text-sm font-semibold">{name}</h3>
              <p className="m-0 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </article>

    <DocsRail />
  </main>
);

export const Route = createFileRoute("/docs")({
  component: Docs,
});
