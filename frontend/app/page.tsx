"use client";

import AppHeader from "./components/AppHeader";
import { ThemeProvider, useTheme } from "./components/ThemeContext";

function MainArea() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <main
      className={`flex-1 min-h-0 ${
        isDark ? "bg-zinc-950" : "bg-slate-50"
      }`}
    />
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <div className="w-screen h-screen flex flex-col overflow-hidden">
        <AppHeader />
        <MainArea />
      </div>
    </ThemeProvider>
  );
}
