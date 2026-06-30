"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { RepoBundle, RepoSummary } from "@/lib/types";

type LoadStatus = "idle" | "loading" | "error";

interface RepoContextValue {
  repos: RepoSummary[];
  selectedSlug: string | null;
  bundle: RepoBundle | null;
  status: LoadStatus;
  error: string | null;
  listLoading: boolean;
  selectRepo: (slug: string) => void;
  clearSelection: () => void;
  refreshRepos: () => void;
}

const RepoContext = createContext<RepoContextValue>({
  repos: [],
  selectedSlug: null,
  bundle: null,
  status: "idle",
  error: null,
  listLoading: true,
  selectRepo: () => {},
  clearSelection: () => {},
  refreshRepos: () => {},
});

export function RepoProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [bundle, setBundle] = useState<RepoBundle | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const refreshRepos = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to load repositories");
      const data = (await res.json()) as RepoSummary[];
      setRepos(data);
    } catch (err) {
      setRepos([]);
      setError(err instanceof Error ? err.message : "Failed to load repositories");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRepos();
  }, [refreshRepos]);

  const selectRepo = useCallback(async (slug: string) => {
    setSelectedSlug(slug);
    setBundle(null);
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load repository");
      }
      const data = (await res.json()) as RepoBundle;
      setBundle(data);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load repository");
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlug(null);
    setBundle(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <RepoContext.Provider
      value={{
        repos,
        selectedSlug,
        bundle,
        status,
        error,
        listLoading,
        selectRepo,
        clearSelection,
        refreshRepos,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  return useContext(RepoContext);
}
