import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

const repoUrl = "https://github.com/mynameistito/cursor-api-cli-windows";

function App() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">cursor-api for Windows</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          OpenAI-compatible Cursor API, locally.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Run a local HTTP server that speaks the OpenAI API and proxies to
          Cursor. Install the CLI, set your key, and point your tools at
          localhost.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/about"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            About cursor-api
          </Link>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            GitHub
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "OpenAI-compatible",
            "Drop in existing tools that expect the OpenAI chat API.",
          ],
          [
            "Local daemon",
            "Run cursor-api in the background with start, stop, and status.",
          ],
          [
            "Windows-first",
            "Single executable bundle with a bundled Node bridge runtime.",
          ],
          [
            "Simple setup",
            "Install via PowerShell, set your key, and connect to localhost.",
          ],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">Quick Start</p>
        <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--sea-ink-soft)]">
          <li>
            Install:{" "}
            <code>
              irm
              https://raw.githubusercontent.com/mynameistito/cursor-api-cli-windows/main/scripts/install.ps1
              | iex
            </code>
          </li>
          <li>
            Set your API key: <code>cursor-api key set</code>
          </li>
          <li>
            Start the server: <code>cursor-api start</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
