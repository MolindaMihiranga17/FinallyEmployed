import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
export const accentColors = [
  { id: "blue", name: "Ocean", color: "#2563eb" },
  { id: "violet", name: "Violet", color: "#7c3aed" },
  { id: "teal", name: "Teal", color: "#0f766e" },
  { id: "rose", name: "Rose", color: "#be185d" },
  { id: "amber", name: "Amber", color: "#b45309" },
  { id: "slate", name: "Graphite", color: "#475569" },
] as const;
export type Accent = (typeof accentColors)[number]["id"];
const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
}>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  accent: "blue",
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, updateAccent] = useState<Accent>(() => {
    try {
      const saved = localStorage.getItem("finallyemployed:accent");
      return accentColors.find((option) => option.id === saved)?.id ?? "blue";
    } catch {
      return "blue";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [theme, updateTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("finallyemployed:theme");
      return saved === "dark" || saved === "system" ? saved : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      setResolvedTheme(dark ? "dark" : "light");
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0b1220" : "#eef2f7");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const setTheme = (next: Theme) => {
    localStorage.setItem("finallyemployed:theme", next);
    updateTheme(next);
  };
  const setAccent = (next: Accent) => {
    localStorage.setItem("finallyemployed:accent", next);
    updateAccent(next);
  };
  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, accent, setAccent }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
