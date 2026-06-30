import { NextResponse } from "next/server";
import { loadRepoBundle, RepoError } from "@/lib/repos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const bundle = loadRepoBundle(slug);
    return NextResponse.json(bundle);
  } catch (err) {
    if (err instanceof RepoError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
