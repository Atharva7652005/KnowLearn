import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { api } from "../api";
import ReactMarkdown from "react-markdown";



export function Notes({ current, token, saveContent, onNotice }) {
  const [generating, setGenerating] = useState(false);
  async function generate() {
    if (generating) return;
    setGenerating(true);
    try { const result = await api(`/learning/content/${current.id}/notes`, { token, method: "POST" }); saveContent({ ...current, notes: result.notes }); }
    catch (error) { onNotice(error.message); }
    finally { setGenerating(false); }
  }
  const action = generating ? <LoadingLabel label="Generating notes" /> : <><RefreshCw size={15} /> {current.notes ? "Refresh notes" : "Generate notes"}</>;
  return <section className="notes-workspace"><div className="notes-head"><div><p>STUDY NOTES</p><h2>English lesson notes</h2><span>Structured notes grounded in your transcript.</span></div><button className="quiz-refresh" onClick={generate} disabled={generating}>{action}</button></div>{current.notes ? <article className="notes-paper"><div className="markdown-prose"><ReactMarkdown>{current.notes}</ReactMarkdown></div></article> : <div className="learning-generator"><span>+</span><h2>Generate notes</h2><p>Create a clear study guide with key ideas, definitions, and revision prompts.</p><button className="primary" onClick={generate} disabled={generating}>{generating ? <LoadingLabel label="Generating notes" /> : "Generate notes"}</button></div>}</section>;
}

function LoadingLabel({ label }) {
  return <span className="loading-label"><LoaderCircle className="spin" size={15} /> {label}</span>;
}

export function Flashcards({ current, token, saveContent, onNotice }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const cards = current.flashcards || [];
  useEffect(() => { setIndex(0); setRevealed(false); }, [current.id, cards.length]);
  async function generate() {
    if (generating) return;
    setGenerating(true);
    try { const result = await api(`/learning/content/${current.id}/flashcards`, { token, method: "POST" }); saveContent({ ...current, flashcards: result.flashcards }); }
    catch (error) { onNotice(error.message); }
    finally { setGenerating(false); }
  }
  if (!cards.length) return <div className="learning-generator"><span>*</span><h2>Build flashcards</h2><p>Create English prompts and answers from this lesson for fast revision.</p><button className="primary" onClick={generate} disabled={generating}>{generating ? <LoadingLabel label="Creating flashcards" /> : "Generate flashcards"}</button></div>;
  const card = cards[index];
  return <section className="flashcard-workspace"><div className="flashcard-top"><div><p>REVISION DECK</p><h2>Flashcards in English</h2></div><button className="quiz-refresh" onClick={generate} disabled={generating}>{generating ? <LoadingLabel label="Creating deck" /> : <><RefreshCw size={15} /> New deck</>}</button></div><div className="w-full h-64 mb-6 cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setRevealed(!revealed)}>
    <div className="relative w-full h-full transition-transform duration-700" style={{ transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
      <div className="absolute inset-0 flex flex-col justify-center items-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow" style={{ backfaceVisibility: 'hidden' }}>
        <span className="text-xs font-bold text-blue-500 tracking-widest mb-4 uppercase">Prompt</span>
        <h3 className="text-xl font-bold text-slate-800 text-center leading-relaxed">{card.front}</h3>
        <small className="absolute bottom-6 text-slate-400">Click to reveal the answer</small>
      </div>
      <div className="absolute inset-0 flex flex-col justify-center items-center p-8 bg-[var(--primary-light)] border border-blue-200 rounded-2xl shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <span className="text-xs font-bold text-[var(--primary-color)] tracking-widest mb-4 uppercase">Answer</span>
        <h3 className="text-xl font-bold text-[var(--text-primary)] text-center leading-relaxed">{card.back}</h3>
        <small className="absolute bottom-6 text-[var(--primary-color)] opacity-70 font-semibold">{card.concept}</small>
      </div>
    </div>
  </div><div className="flashcard-controls"><span>{index + 1} of {cards.length}</span><button onClick={() => setRevealed(!revealed)}>{revealed ? "Show prompt" : "Reveal answer"}</button><button className="primary" onClick={() => { setIndex((value) => (value + 1) % cards.length); setRevealed(false); }}>Next card</button></div></section>;
}



