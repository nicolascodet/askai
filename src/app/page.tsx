"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-key-123";

interface ClassifierData {
  skill: string;
  model: string;
  industry: string;
  task_type: string;
  complexity: string;
  risk: string;
  depth: string;
  reasoning: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  classifier?: ClassifierData;
  skillName?: string;
  modelUsed?: string;
  reviewed?: boolean;
  costUsd?: number;
  elapsed?: number;
  streaming?: boolean;
}

function Badge({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-800/60 text-zinc-400 border-zinc-700/50",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${colors[color] || colors.zinc}`}
    >
      {children}
    </span>
  );
}

function ThinkingStep({ label, value, done }: { label: string; value?: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? "bg-emerald-400" : "bg-indigo-400 animate-pulse-soft"}`}
      />
      <span className="text-zinc-500">{label}</span>
      {value && <span className="text-zinc-300 truncate">{value}</span>}
    </div>
  );
}

function AnswerRenderer({ text }: { text: string }) {
  const html = text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^---$/gm, "<hr />")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return (
    <div
      className="answer-text text-[14px] text-zinc-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingState, setThinkingState] = useState<{
    stage: "classifying" | "executing" | "reviewing" | "done" | null;
    classifier?: ClassifierData;
    skillName?: string;
  }>({ stage: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingState]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setThinkingState({ stage: "classifying" });

    try {
      const response = await fetch(`${API_URL}/v1/ask/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": API_KEY,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      let classifier: ClassifierData | undefined;
      let skillName: string | undefined;
      let modelUsed: string | undefined;
      let reviewed = false;
      let costUsd = 0;
      let elapsed = 0;

      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === "classifier") {
              classifier = event.data;
              setThinkingState({ stage: "executing", classifier });
            } else if (event.type === "skill") {
              skillName = event.data.name;
              setThinkingState((prev) => ({ ...prev, skillName }));
            } else if (event.type === "chunk") {
              answer += event.data;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: answer,
                  streaming: true,
                };
                return updated;
              });
            } else if (event.type === "done") {
              modelUsed = event.data.model_used;
              reviewed = event.data.reviewed;
              costUsd = event.data.cost_usd;
              elapsed = event.data.elapsed;
            }
          } catch {
            // skip
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: answer,
          classifier,
          skillName,
          modelUsed,
          reviewed,
          costUsd,
          elapsed,
          streaming: false,
        };
        return updated;
      });
      setThinkingState({ stage: "done" });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.filter((m) => !m.streaming),
        {
          role: "assistant",
          content: "Something went wrong. Make sure the ask.ai backend is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setThinkingState({ stage: null });
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-dvh max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            ask.ai
          </span>
        </div>
        <span className="text-[11px] text-zinc-600 hidden sm:block">
          22 skills &middot; 11 models &middot; 6 providers
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-200 mb-1">
                Ask anything
              </h2>
              <p className="text-[13px] text-zinc-500 max-w-sm">
                The right expert and model are picked automatically. Strategy,
                code, legal, finance, marketing, research — all covered.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "Review my SaaS pricing strategy",
                "Debug this Python stack trace",
                "Analyze this NDA clause",
                "Should we raise our seed now?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[12px] px-3 py-1.5 rounded-lg glass text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-indigo-500/15 border border-indigo-500/20 text-[14px] text-zinc-200">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-full w-full space-y-3">
                {msg.skillName && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge color="indigo">{msg.skillName}</Badge>
                    {msg.modelUsed && <Badge>{msg.modelUsed}</Badge>}
                    {msg.reviewed && <Badge color="green">Reviewed</Badge>}
                    {msg.classifier?.risk === "high" && (
                      <Badge color="red">High Risk</Badge>
                    )}
                    {msg.costUsd !== undefined && msg.costUsd > 0 && (
                      <Badge>${msg.costUsd.toFixed(4)}</Badge>
                    )}
                    {msg.elapsed !== undefined && msg.elapsed > 0 && (
                      <Badge>{msg.elapsed}s</Badge>
                    )}
                  </div>
                )}

                {msg.classifier?.reasoning && (
                  <div className="text-[12px] text-zinc-500 italic pl-0.5">
                    {msg.classifier.reasoning}
                  </div>
                )}

                <div
                  className={`glass rounded-2xl rounded-tl-md px-4 py-3 ${msg.streaming ? "cursor-blink" : ""}`}
                >
                  {msg.content ? (
                    <AnswerRenderer text={msg.content} />
                  ) : (
                    <div className="text-zinc-500 text-[13px] animate-pulse-soft">
                      Thinking...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Thinking steps */}
        {thinkingState.stage &&
          thinkingState.stage !== "done" &&
          !messages.some((m) => m.streaming && m.content) && (
            <div className="glass rounded-xl px-4 py-3 space-y-1.5 max-w-xs">
              <ThinkingStep
                label="Classifying"
                value={
                  thinkingState.classifier
                    ? `→ ${thinkingState.classifier.industry}/${thinkingState.classifier.task_type}`
                    : undefined
                }
                done={!!thinkingState.classifier}
              />
              <ThinkingStep
                label="Routing"
                value={
                  thinkingState.skillName
                    ? `→ ${thinkingState.skillName}`
                    : thinkingState.classifier
                      ? `→ ${thinkingState.classifier.model}`
                      : undefined
                }
                done={
                  thinkingState.stage === "executing" ||
                  thinkingState.stage === "reviewing"
                }
              />
              <ThinkingStep label="Generating" done={false} />
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 pb-safe">
        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl px-4 py-3 flex items-end gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-zinc-200 placeholder-zinc-600 resize-none outline-none max-h-40"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[11px] text-zinc-700 mt-2">
          Routes to the best expert + model automatically
        </p>
      </div>
    </div>
  );
}
