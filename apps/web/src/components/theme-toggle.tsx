import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "auto";

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }

  return "auto";
};

const resolveThemeMode = (mode: ThemeMode, prefersDark: boolean) => {
  if (mode !== "auto") {
    return mode;
  }

  if (prefersDark) {
    return "dark";
  }

  return "light";
};

const applyThemeMode = (mode: ThemeMode) => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveThemeMode(mode, prefersDark);

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);

  if (mode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }

  document.documentElement.style.colorScheme = resolved;
};

const getNextMode = (mode: ThemeMode): ThemeMode => {
  if (mode === "light") {
    return "dark";
  }

  if (mode === "dark") {
    return "auto";
  }

  return "light";
};

const getModeIcon = (mode: ThemeMode) => {
  if (mode === "auto") {
    return Monitor;
  }

  if (mode === "dark") {
    return Moon;
  }

  return Sun;
};

const getModeText = (mode: ThemeMode) => {
  if (mode === "auto") {
    return "Auto";
  }

  if (mode === "dark") {
    return "Dark";
  }

  return "Light";
};

export const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const initialMode = getInitialMode();
    setMode(initialMode);
    applyThemeMode(initialMode);
  }, []);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const toggleMode = () => {
    const nextMode = getNextMode(mode);
    setMode(nextMode);
    applyThemeMode(nextMode);
    window.localStorage.setItem("theme", nextMode);
  };

  const label =
    mode === "auto"
      ? "Theme mode: auto (system). Click to switch to light mode."
      : `Theme mode: ${mode}. Click to switch mode.`;

  const Icon = getModeIcon(mode);

  return (
    <Button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      size="sm"
      variant="outline"
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{getModeText(mode)}</span>
    </Button>
  );
};
