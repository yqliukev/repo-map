import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.K2_API_KEY,
  baseURL: "https://api.k2think.ai/v1",
});

const MODEL = "MBZUAI-IFM/K2-Think-v2";

interface PersonSummary {
  id: string;
  name: string;
  role: string;
  team: string;
  expertise: string[];
  skills_summary?: string;
  work_summary?: string;
  project_roles?: Record<string, { weight: number; role: string }>;
}

function loadPeopleContext(): PersonSummary[] {
  const raw = readFileSync(
    join(process.cwd(), "public", "graph.json"),
    "utf-8",
  );
  const data = JSON.parse(raw);
  return data.nodes.map((n: PersonSummary) => ({
    id: n.id,
    name: n.name,
    role: n.role,
    team: n.team,
    expertise: n.expertise || [],
    skills_summary: n.skills_summary,
    work_summary: n.work_summary,
    project_roles: n.project_roles,
  }));
}

function buildSystemPrompt(people: PersonSummary[]): string {
  const peopleBlock = people
    .map(
      (p) =>
        `[${p.id}] ${p.name} | ${p.role} | ${p.team}\n` +
        `  Expertise (ordered, strongest first): ${p.expertise.length > 0 ? p.expertise.join(", ") : "N/A"}\n` +
        `  Skills: ${p.skills_summary || "N/A"}\n` +
        `  Work: ${p.work_summary || "N/A"}\n` +
        `  Projects: ${
          p.project_roles
            ? Object.entries(p.project_roles)
                .map(([pid, pr]) => `${pid} (${pr.role}, ${pr.weight})`)
                .join(", ")
            : "N/A"
        }`,
    )
    .join("\n\n");

  return `You are an assistant for an organization graph visualization tool called OrgGraph. Answer questions about people, their skills, projects, and work using ONLY the data provided below.

IMPORTANT DISTINCTIONS:
- "Expertise" tags are the AUTHORITATIVE measure of what someone is an expert in. They are ordered by strength (first = strongest). When asked "who is an expert in X?", ONLY include people whose Expertise list contains X or a closely related tag. Do NOT include someone just because they worked on a project that involves X.
- "Projects" show what someone contributed to and their role (lead/core/contributor). Working on a project does NOT make someone an expert in that project's domain.
- "Skills" and "Work" summaries provide additional context about what someone does.

RULES:
- Only use the information below. Do not fabricate or guess.
- When you reference specific people, include their exact IDs (like "alice_chen") in the highlightNodeIds array.
- For "who is an expert" questions: match against the Expertise tags. Prioritize people whose expertise is listed earlier (stronger match). Only include 2-4 of the best matches, not everyone tangentially related.
- For "who is working on" questions: use the Projects data and role/weight to find contributors.
- Keep answers concise but informative (2-4 sentences).
- You MUST respond with valid JSON and nothing else. No markdown, no code fences.

RESPONSE FORMAT (strict JSON):
{"answer": "Your natural language answer here.", "highlightNodeIds": ["person_id_1", "person_id_2"]}

=== PEOPLE DATA ===
${peopleBlock}`;
}

function extractJson(raw: string): { answer: string; highlightNodeIds: string[] } {
  // Strategy 1: Strip all <think>...</think> blocks and parse what remains
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // If an unclosed <think> tag remains, take only what's AFTER it
  // (the model puts thinking first, answer last)
  if (cleaned.includes("<think>")) {
    const parts = raw.split("</think>");
    cleaned = parts[parts.length - 1]?.trim() ?? cleaned;
  }

  // Strategy 2: Find a balanced JSON object by scanning char-by-char
  // This avoids greedy regex issues when think blocks contain { }
  const json = findBalancedJson(cleaned) ?? findBalancedJson(raw);
  if (json) {
    const result = JSON.parse(json);
    if (result.answer) return result;
  }

  throw new Error("Could not extract valid JSON from model output");
}

function findBalancedJson(text: string): string | null {
  // Walk backwards from the end to find the last top-level JSON object,
  // which is most likely the actual answer (thinking comes first).
  let end = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "}") { end = i; break; }
  }
  if (end === -1) return null;

  // Try each `{` position as a candidate start for valid JSON
  for (let i = end; i >= 0; i--) {
    if (text[i] === "{") {
      const candidate = text.slice(i, end + 1);
      try {
        const obj = JSON.parse(candidate);
        if (obj && typeof obj.answer === "string") return candidate;
      } catch {
        continue;
      }
    }
  }

  // Forward scan: try every { and see if it parses
  for (let i = text.lastIndexOf('{"answer"'); i >= 0; i = text.lastIndexOf('{"answer"', i - 1)) {
    const candidate = text.slice(i, end + 1);
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.answer === "string") return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = (await req.json()) as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const people = loadPeopleContext();
    const systemPrompt = buildSystemPrompt(people);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (history) {
      for (const msg of history.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[chat] raw LLM output length:", raw.length);
    console.log("[chat] raw LLM output (last 500 chars):", raw.slice(-500));

    let parsed: { answer: string; highlightNodeIds: string[] };
    try {
      parsed = extractJson(raw);
    } catch (parseErr) {
      console.error("[chat] JSON extraction failed:", parseErr);
      console.error("[chat] full raw output:", raw);
      parsed = { answer: "I wasn't able to process that. Please try again.", highlightNodeIds: [] };
    }

    const validIds = new Set(people.map((p) => p.id));
    parsed.highlightNodeIds = parsed.highlightNodeIds.filter((id) =>
      validIds.has(id),
    );

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Failed to get response from LLM" },
      { status: 500 },
    );
  }
}
