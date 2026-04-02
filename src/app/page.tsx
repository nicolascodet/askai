"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-key-123";

// ── Skill avatars — emoji + color per skill ──────────────────────────
const SKILL_AVATARS: Record<string, { emoji: string; color: string }> = {
  startup_advisor:        { emoji: "🚀", color: "from-violet-500/20 to-purple-500/20 border-violet-500/30" },
  product_strategist:     { emoji: "🎯", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30" },
  decision_coach:         { emoji: "⚖️", color: "from-amber-500/20 to-orange-500/20 border-amber-500/30" },
  marketing_analyst:      { emoji: "📊", color: "from-pink-500/20 to-rose-500/20 border-pink-500/30" },
  sales_copywriter:       { emoji: "✍️", color: "from-orange-500/20 to-red-500/20 border-orange-500/30" },
  growth_debugger:        { emoji: "📈", color: "from-emerald-500/20 to-green-500/20 border-emerald-500/30" },
  customer_support_writer:{ emoji: "💬", color: "from-sky-500/20 to-blue-500/20 border-sky-500/30" },
  code_reviewer:          { emoji: "🔍", color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30" },
  debugging_engineer:     { emoji: "🐛", color: "from-red-500/20 to-orange-500/20 border-red-500/30" },
  systems_architect:      { emoji: "🏗️", color: "from-slate-500/20 to-zinc-500/20 border-slate-500/30" },
  technical_writer:       { emoji: "📝", color: "from-teal-500/20 to-cyan-500/20 border-teal-500/30" },
  devops_responder:       { emoji: "⚙️", color: "from-zinc-500/20 to-stone-500/20 border-zinc-500/30" },
  financial_analyst:      { emoji: "💰", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
  legal_analyst:          { emoji: "⚖️", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30" },
  risk_analyst:           { emoji: "🛡️", color: "from-red-500/20 to-rose-500/20 border-red-500/30" },
  research_assistant:     { emoji: "🔬", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30" },
  market_researcher:      { emoji: "🌐", color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30" },
  logic_checker:          { emoji: "🧠", color: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/30" },
  trend_spotter:          { emoji: "🔮", color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30" },
  creative_writer:        { emoji: "🎨", color: "from-rose-500/20 to-pink-500/20 border-rose-500/30" },
  ux_critic:              { emoji: "👁️", color: "from-violet-500/20 to-indigo-500/20 border-violet-500/30" },
  educator:               { emoji: "📚", color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30" },
  generalist:             { emoji: "✨", color: "from-zinc-500/20 to-slate-500/20 border-zinc-500/30" },
};

const DEFAULT_AVATAR = { emoji: "✨", color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30" };

interface ClassifierData {
  skill: string; model: string; industry: string; task_type: string;
  complexity: string; risk: string; depth: string; reasoning: string;
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

// ── Components ───────────────────────────────────────────────────────

function SkillAvatar({ skillKey, size = "md" }: { skillKey?: string; size?: "sm" | "md" }) {
  const av = (skillKey && SKILL_AVATARS[skillKey]) || DEFAULT_AVATAR;
  const s = size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-lg";
  return (
    <div className={`${s} rounded-xl bg-gradient-to-br ${av.color} border flex items-center justify-center flex-shrink-0`}>
      {av.emoji}
    </div>
  );
}

function Badge({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    zinc:   "bg-zinc-800/50 text-zinc-400 border-zinc-700/40",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    green:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red:    "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md border ${c[color] || c.zinc}`}>
      {children}
    </span>
  );
}

function ThinkingCard({ stage, classifier, skillName }: {
  stage: string;
  classifier?: ClassifierData;
  skillName?: string;
}) {
  return (
    <div className="animate-fade-up flex items-start gap-3 max-w-sm">
      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin-slow" />
      </div>
      <div className="glass rounded-xl rounded-tl-sm px-3.5 py-2.5 space-y-1.5 flex-1">
        <Step label="Classifying prompt" value={classifier ? `${classifier.industry} / ${classifier.task_type}` : undefined} done={!!classifier} />
        <Step label="Selecting expert" value={skillName} done={!!skillName} />
        <Step label="Choosing model" value={classifier?.model} done={!!classifier?.model && !!skillName} />
        {stage === "executing" && skillName && (
          <Step label="Generating answer" done={false} />
        )}
      </div>
    </div>
  );
}

function Step({ label, value, done }: { label: string; value?: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? "bg-emerald-400" : "bg-indigo-400 animate-pulse-soft"}`} />
      <span className="text-zinc-500">{label}</span>
      {value && <span className="text-zinc-300 font-medium truncate">{value}</span>}
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
    <div className="answer-text text-[13.5px] text-zinc-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
  );
}

// ── Main ─────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState<{
    stage: string | null;
    classifier?: ClassifierData;
    skillName?: string;
  }>({ stage: null });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput("");
    setIsLoading(true);
    setMessages(p => [...p, { role: "user", content: prompt }]);
    setThinking({ stage: "classifying" });

    try {
      const res = await fetch(`${API_URL}/v1/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let answer = "", classifier: ClassifierData | undefined, skillName: string | undefined;
      let modelUsed: string | undefined, reviewed = false, costUsd = 0, elapsed = 0;

      setMessages(p => [...p, { role: "assistant", content: "", streaming: true }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "classifier") {
              classifier = ev.data;
              setThinking({ stage: "executing", classifier });
            } else if (ev.type === "skill") {
              skillName = ev.data.name;
              setThinking(p => ({ ...p, skillName }));
            } else if (ev.type === "chunk") {
              answer += ev.data;
              setMessages(p => {
                const u = [...p];
                u[u.length - 1] = { ...u[u.length - 1], content: answer, streaming: true };
                return u;
              });
            } else if (ev.type === "done") {
              modelUsed = ev.data.model_used;
              reviewed = ev.data.reviewed;
              costUsd = ev.data.cost_usd;
              elapsed = ev.data.elapsed;
            }
          } catch { /* skip */ }
        }
      }

      setMessages(p => {
        const u = [...p];
        u[u.length - 1] = {
          role: "assistant", content: answer, classifier, skillName,
          modelUsed, reviewed, costUsd, elapsed, streaming: false,
        };
        return u;
      });
    } catch (err) {
      console.error(err);
      setMessages(p => [
        ...p.filter(m => !m.streaming),
        { role: "assistant", content: "Connection failed. Check that the ask.ai backend is running." },
      ]);
    } finally {
      setIsLoading(false);
      setThinking({ stage: null });
      inputRef.current?.focus();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto bg-mesh">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">A</span>
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-zinc-100">ask.ai</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600 hidden sm:block">22 experts &middot; 11 models &middot; 6 providers</span>
          {hasMessages && (
            <button
              onClick={() => { setMessages([]); setThinking({ stage: null }); }}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Empty state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-2xl">✦</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 mb-1.5">What do you need?</h1>
              <p className="text-[13px] text-zinc-500 max-w-md leading-relaxed">
                Ask anything. The right expert and AI model are selected automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md mt-1">
              {[
                { q: "Review my SaaS pricing page", icon: "📊" },
                { q: "Debug this stack trace", icon: "🐛" },
                { q: "Analyze this NDA clause", icon: "⚖️" },
                { q: "Should we raise our seed now?", icon: "🚀" },
              ].map(({ q, icon }) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="flex items-center gap-2 text-left text-[12px] px-3 py-2.5 rounded-xl glass text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] transition-all"
                >
                  <span>{icon}</span>
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={`animate-fade-up flex ${msg.role === "user" ? "justify-end" : "items-start gap-3"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-indigo-500/12 border border-indigo-500/15 text-[13.5px] text-zinc-200 leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <>
                <SkillAvatar skillKey={msg.classifier?.skill} />
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header badges */}
                  {msg.skillName && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-medium text-zinc-200">{msg.skillName}</span>
                      {msg.modelUsed && <Badge>{msg.modelUsed}</Badge>}
                      {msg.reviewed && <Badge color="green">reviewed</Badge>}
                      {msg.classifier?.risk === "high" && <Badge color="red">high risk</Badge>}
                      {(msg.costUsd ?? 0) > 0 && <Badge>${msg.costUsd!.toFixed(4)}</Badge>}
                      {(msg.elapsed ?? 0) > 0 && <Badge>{msg.elapsed}s</Badge>}
                    </div>
                  )}

                  {/* Reasoning */}
                  {msg.classifier?.reasoning && (
                    <p className="text-[11px] text-zinc-600 italic leading-relaxed">{msg.classifier.reasoning}</p>
                  )}

                  {/* Answer bubble */}
                  <div className={`glass rounded-2xl rounded-tl-sm px-4 py-3 ${msg.streaming ? "cursor-blink" : ""}`}>
                    {msg.content ? (
                      <AnswerRenderer text={msg.content} />
                    ) : (
                      <span className="text-zinc-600 text-[13px] animate-pulse-soft">Thinking...</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {thinking.stage && thinking.stage !== "done" && !messages.some(m => m.streaming && m.content) && (
          <ThinkingCard stage={thinking.stage} classifier={thinking.classifier} skillName={thinking.skillName} />
        )}
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 pb-4 pt-2 pb-safe">
        <form onSubmit={send} className="glass rounded-2xl px-4 py-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-[13.5px] text-zinc-200 placeholder-zinc-600 resize-none outline-none max-h-36"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
