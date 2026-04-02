"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-key-123";

// ── Skill avatars ────────────────────────────────────────────────────
const AVATARS: Record<string, { emoji: string; bg: string }> = {
  startup_advisor:        { emoji: "🚀", bg: "from-violet-500/20 to-purple-600/20 border-violet-500/25" },
  product_strategist:     { emoji: "🎯", bg: "from-blue-500/20 to-cyan-500/20 border-blue-500/25" },
  decision_coach:         { emoji: "⚖️", bg: "from-amber-500/20 to-orange-500/20 border-amber-500/25" },
  marketing_analyst:      { emoji: "📊", bg: "from-pink-500/20 to-rose-500/20 border-pink-500/25" },
  sales_copywriter:       { emoji: "✍️", bg: "from-orange-500/20 to-red-500/20 border-orange-500/25" },
  growth_debugger:        { emoji: "📈", bg: "from-emerald-500/20 to-green-500/20 border-emerald-500/25" },
  customer_support_writer:{ emoji: "💬", bg: "from-sky-500/20 to-blue-500/20 border-sky-500/25" },
  code_reviewer:          { emoji: "🔍", bg: "from-indigo-500/20 to-violet-500/20 border-indigo-500/25" },
  debugging_engineer:     { emoji: "🐛", bg: "from-red-500/20 to-orange-500/20 border-red-500/25" },
  systems_architect:      { emoji: "🏗️", bg: "from-slate-400/20 to-zinc-500/20 border-slate-500/25" },
  technical_writer:       { emoji: "📝", bg: "from-teal-500/20 to-cyan-500/20 border-teal-500/25" },
  devops_responder:       { emoji: "⚙️", bg: "from-zinc-400/20 to-stone-500/20 border-zinc-500/25" },
  financial_analyst:      { emoji: "💰", bg: "from-green-500/20 to-emerald-500/20 border-green-500/25" },
  legal_analyst:          { emoji: "⚖️", bg: "from-amber-500/20 to-yellow-500/20 border-amber-500/25" },
  risk_analyst:           { emoji: "🛡️", bg: "from-red-500/20 to-rose-500/20 border-red-500/25" },
  research_assistant:     { emoji: "🔬", bg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/25" },
  market_researcher:      { emoji: "🌐", bg: "from-blue-500/20 to-indigo-500/20 border-blue-500/25" },
  logic_checker:          { emoji: "🧠", bg: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/25" },
  trend_spotter:          { emoji: "🔮", bg: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/25" },
  creative_writer:        { emoji: "🎨", bg: "from-rose-500/20 to-pink-500/20 border-rose-500/25" },
  ux_critic:              { emoji: "👁️", bg: "from-violet-500/20 to-indigo-500/20 border-violet-500/25" },
  educator:               { emoji: "📚", bg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/25" },
  generalist:             { emoji: "✨", bg: "from-zinc-400/20 to-slate-500/20 border-zinc-500/25" },
};
const DEFAULT_AV = { emoji: "✨", bg: "from-indigo-500/20 to-violet-500/20 border-indigo-500/25" };

interface Classifier {
  skill: string; model: string; industry: string; task_type: string;
  complexity: string; risk: string; depth: string; reasoning: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  classifier?: Classifier;
  skillName?: string;
  skillKey?: string;
  modelUsed?: string;
  reviewed?: boolean;
  costUsd?: number;
  elapsed?: number;
  streaming?: boolean;
  // Thinking steps stored per-message
  steps?: { classifying: boolean; classified?: Classifier; routed?: string; routedKey?: string; generating: boolean };
}

// ── Small components ─────────────────────────────────────────────────

function Avatar({ skillKey }: { skillKey?: string }) {
  const a = (skillKey && AVATARS[skillKey]) || DEFAULT_AV;
  return (
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${a.bg} border flex items-center justify-center flex-shrink-0 text-base`}>
      {a.emoji}
    </div>
  );
}

function Pill({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    zinc:   "bg-zinc-800/40 text-zinc-500 border-zinc-700/30",
    green:  "bg-emerald-500/8 text-emerald-400 border-emerald-500/15",
    red:    "bg-red-500/8 text-red-400 border-red-500/15",
    indigo: "bg-indigo-500/8 text-indigo-400 border-indigo-500/15",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-px text-[10px] font-medium rounded-md border ${c[color] || c.zinc}`}>
      {children}
    </span>
  );
}

function Dot({ done }: { done: boolean }) {
  return (
    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${done ? "bg-emerald-400" : "bg-indigo-400 animate-pulse-soft"}`} />
  );
}

function StepLine({ label, value, done }: { label: string; value?: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] leading-tight">
      <Dot done={done} />
      <span className="text-zinc-600">{label}</span>
      {value && <span className="text-zinc-400 font-medium truncate">{value}</span>}
    </div>
  );
}

// ── Thinking steps inside the message ────────────────────────────────

function ThinkingSteps({ steps }: { steps: Msg["steps"] }) {
  if (!steps) return null;
  return (
    <div className="space-y-1 py-1">
      <StepLine label="Classifying" value={steps.classified ? `${steps.classified.industry} · ${steps.classified.task_type}` : undefined} done={!!steps.classified} />
      <StepLine label="Expert" value={steps.routed} done={!!steps.routed} />
      <StepLine label="Model" value={steps.classified?.model} done={!!steps.routed} />
      {steps.generating && <StepLine label="Generating..." done={false} />}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scroll = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  useEffect(scroll, [msgs]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
  }, [input]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);

    // User message
    setMsgs(p => [...p, { role: "user", content: prompt }]);

    // Assistant message with thinking steps
    const idx = msgs.length + 1; // index of assistant msg
    setMsgs(p => [...p, {
      role: "assistant", content: "", streaming: true,
      steps: { classifying: true, generating: false },
    }]);

    try {
      const res = await fetch(`${API_URL}/v1/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
        body: JSON.stringify({
          prompt,
          history: msgs.filter(m => m.content).map(m => ({ role: m.role, content: m.content.slice(0, 500) })).slice(-6),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let answer = "";
      let classifier: Classifier | undefined;
      let skillName: string | undefined, skillKey: string | undefined;
      let modelUsed: string | undefined, reviewed = false, costUsd = 0, elapsed = 0;

      const update = (fn: (m: Msg) => Partial<Msg>) => {
        setMsgs(p => {
          const u = [...p];
          const last = u[u.length - 1];
          u[u.length - 1] = { ...last, ...fn(last) };
          return u;
        });
      };

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));

            if (ev.type === "classifier") {
              classifier = ev.data;
              update(() => ({
                steps: { classifying: true, classified: classifier, generating: false },
              }));
            } else if (ev.type === "skill") {
              skillName = ev.data.name;
              skillKey = ev.data.key;
              update(() => ({
                skillName, skillKey,
                steps: { classifying: true, classified: classifier, routed: skillName, routedKey: skillKey, generating: true },
              }));
            } else if (ev.type === "chunk") {
              answer += ev.data;
              update(() => ({ content: answer }));
            } else if (ev.type === "done") {
              modelUsed = ev.data.model_used;
              reviewed = ev.data.reviewed;
              costUsd = ev.data.cost_usd;
              elapsed = ev.data.elapsed;
            }
          } catch { /* skip */ }
        }
      }

      // Finalize
      update(() => ({
        content: answer, classifier, skillName, skillKey, modelUsed,
        reviewed, costUsd, elapsed, streaming: false, steps: undefined,
      }));
    } catch (err) {
      console.error(err);
      setMsgs(p => {
        const u = [...p];
        u[u.length - 1] = {
          role: "assistant",
          content: "Connection failed — is the backend running?",
          streaming: false, steps: undefined,
        };
        return u;
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto bg-mesh">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">A</span>
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-zinc-100">ask.ai</span>
        </div>
        {!empty && (
          <button onClick={() => setMsgs([])} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
            New chat
          </button>
        )}
      </header>

      {/* ── Messages ────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Empty state */}
        {empty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-fade-up px-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/12 to-violet-500/12 border border-indigo-500/15 flex items-center justify-center text-xl">
              ✦
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100 mb-1">What do you need?</h1>
              <p className="text-[12.5px] text-zinc-600 max-w-xs leading-relaxed">
                The right expert and AI model are picked for every question.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm mt-1">
              {[
                { q: "Review my SaaS pricing page", icon: "📊" },
                { q: "Debug this stack trace", icon: "🐛" },
                { q: "Analyze this NDA clause", icon: "⚖️" },
                { q: "Should we raise our seed now?", icon: "🚀" },
              ].map(({ q, icon }) => (
                <button key={q} onClick={() => setInput(q)}
                  className="flex items-center gap-2 text-left text-[11.5px] px-2.5 py-2 rounded-xl glass text-zinc-500 hover:text-zinc-300 transition-all active:scale-[0.98]">
                  <span>{icon}</span>
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {msgs.map((m, i) => (
          <div key={i} className={`animate-fade-up ${m.role === "user" ? "flex justify-end" : "flex items-start gap-2.5"}`}>
            {m.role === "user" ? (
              <div className="max-w-[82%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-indigo-500/10 border border-indigo-500/12 text-[13.5px] text-zinc-200 leading-relaxed">
                {m.content}
              </div>
            ) : (
              <>
                <Avatar skillKey={m.skillKey || m.classifier?.skill} />
                <div className="flex-1 min-w-0 space-y-1.5">

                  {/* Skill name + badges — shown once we know the skill */}
                  {(m.skillName || m.steps?.routed) && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[12px] font-medium text-zinc-300">{m.skillName || m.steps?.routed}</span>
                      {m.modelUsed && <Pill>{m.modelUsed}</Pill>}
                      {m.reviewed && <Pill color="green">reviewed</Pill>}
                      {m.classifier?.risk === "high" && <Pill color="red">high risk</Pill>}
                      {(m.costUsd ?? 0) > 0 && <Pill>${m.costUsd!.toFixed(4)}</Pill>}
                      {(m.elapsed ?? 0) > 0 && <Pill>{m.elapsed}s</Pill>}
                    </div>
                  )}

                  {/* Reasoning line */}
                  {m.classifier?.reasoning && !m.streaming && (
                    <p className="text-[10.5px] text-zinc-600 italic">{m.classifier.reasoning}</p>
                  )}

                  {/* Answer card */}
                  <div className={`glass rounded-2xl rounded-tl-sm px-3.5 py-3 ${m.streaming && m.content ? "cursor-blink" : ""}`}>
                    {/* Thinking steps — visible while streaming */}
                    {m.steps && <ThinkingSteps steps={m.steps} />}

                    {/* Separator between steps and content */}
                    {m.steps && m.content && (
                      <div className="border-t border-white/[0.04] my-2" />
                    )}

                    {/* Content */}
                    {m.content ? (
                      <div className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : m.steps ? null : (
                      <span className="text-zinc-600 text-[12px] animate-pulse-soft">Thinking...</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Input ───────────────────────────────────────────────── */}
      <div className="px-4 pb-3 pt-1.5 pb-safe">
        <form onSubmit={send} className="glass rounded-2xl px-3.5 py-2.5 flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-[13.5px] text-zinc-200 placeholder-zinc-600 resize-none outline-none max-h-32 leading-relaxed"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/25 transition-all disabled:opacity-15 disabled:cursor-not-allowed active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
