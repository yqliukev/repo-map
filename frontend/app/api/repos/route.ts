import { NextResponse } from "next/server";
import { listCachedRepos } from "@/lib/repos";

export async function GET() {
  const repos = listCachedRepos();
  return NextResponse.json(repos);
}
