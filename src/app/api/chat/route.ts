import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ModelMessage, UserContent } from "ai";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatAttachment {
  name: string;
  contentType: string;
  /** Base64 data URL: "data:<mime>;base64,<data>" */
  url: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert AI communications assistant embedded in the Delta Marketing Portal.
Your role is to help the marketing team with:
- Drafting and refining press releases, announcements, and corporate communications
- Writing and optimising social media content for LinkedIn, X (Twitter), and Instagram
- Analysing uploaded documents, invoices, images, or files and summarising findings
- Answering questions about the approval workflow and task management

Be concise, professional, and genuinely helpful. Format responses with clear paragraphs.
When drafting content, match a polished corporate tone. Never fabricate data.
If you receive a file or image, acknowledge it and provide useful analysis.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert client-side ChatMessage[] into the ModelMessage[] format required by ai@6 streamText. */
function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    if (msg.role === "assistant") {
      return { role: "assistant", content: msg.content };
    }

    // User message — check for multimodal attachments
    if (!msg.attachments?.length) {
      return { role: "user", content: msg.content };
    }

    const content: UserContent = [
      { type: "text", text: msg.content || "Please analyse the attached file(s)." },
      ...msg.attachments.map((att) => {
        // Strip the data-URL prefix to get raw base64
        const base64 = att.url.includes(",") ? att.url.split(",")[1] : att.url;
        const mimeType = att.contentType as `${string}/${string}`;

        if (att.contentType.startsWith("image/")) {
          return { type: "image" as const, image: base64, mimeType };
        }
        return { type: "file" as const, data: base64, mimeType };
      }),
    ];

    return { role: "user", content };
  });
}

// ── Simulation stream ─────────────────────────────────────────────────────────

const SIMULATION_REPLIES = [
  (q: string) =>
    `I'd be happy to help with that! Here's a draft based on your input:\n\n**${q.slice(0, 40).trim()}…**\n\nThis is a simulated AI response from the Delta Marketing Portal. The system is running in **Simulation Mode** because no GEMINI_API_KEY is configured.\n\nTo enable live AI-powered responses:\n1. Obtain a key from [Google AI Studio](https://aistudio.google.com)\n2. Add \`GEMINI_API_KEY=your_key\` to your Vercel environment variables\n3. Redeploy the project\n\nIn the meantime, the full UI, streaming animation, and file attachment workflow are all functional.`,
  () =>
    "Great question! In Simulation Mode I can walk you through the workflow:\n\n• **Draft Press Release** — describe the announcement and key bullet points.\n• **Process Invoice** — upload a PDF and Gemini will extract vendor, totals, and line items.\n• **Approval Workflow** — every draft you create becomes a Task that managers can approve, request changes on, or reject.\n\nOnce your API key is connected, I'll respond with live, context-aware AI content.",
];

function buildSimulationText(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const q = lastUser?.content ?? "";
  const idx = messages.length % SIMULATION_REPLIES.length;
  return SIMULATION_REPLIES[idx](q);
}

function createSimulatedStream(text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(" ");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Realistic initial "thinking" pause
      await new Promise((r) => setTimeout(r, 480));

      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? " " : "");
        controller.enqueue(encoder.encode(chunk));
        // Variable delay for natural feel
        await new Promise((r) => setTimeout(r, 28 + Math.random() * 44));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Simulation-Mode": "true",
    },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Simulation mode ───────────────────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      return createSimulatedStream(buildSimulationText(messages));
    }

    // ── Live Gemini mode ──────────────────────────────────────────────────
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const result = streamText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_PROMPT,
      messages: toModelMessages(messages),
    });

    return result.toTextStreamResponse({
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
