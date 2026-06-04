import { TEAM_COLORS } from "./types";
import { useTheme } from "../ThemeContext";

export default function Legend() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm space-y-1.5 ${
        isDark
          ? "bg-zinc-800/80 text-zinc-300"
          : "bg-white/90 border border-slate-200 shadow-sm text-slate-700"
      }`}
    >
      {Object.entries(TEAM_COLORS).map(([team, color]) => (
        <div key={team} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="capitalize">{team}</span>
        </div>
      ))}
    </div>
  );
}
