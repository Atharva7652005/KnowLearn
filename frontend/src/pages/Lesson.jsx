import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { Bot, LoaderCircle, MessageCircle, RefreshCw, Send, Sparkles, ChevronDown, Check, Globe, Clock, FileText, PlaySquare, Copy, ExternalLink, Video, Volume2, Square } from "lucide-react";
import { Flashcards, Notes } from "../components/LearningExtras";
import ReactMarkdown from "react-markdown";

function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

const TRANSLATION_LANGUAGES = [
  "English",
  "Hindi", "Bengali", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam",
  "Chinese", "Spanish", "Arabic", "French", "Japanese"
];

function getLanguagesForPlan(plan) {
  if (plan === "Free") return ["English"];
  if (plan === "Basic") return ["English", "Hindi"];
  if (plan === "Pro") return TRANSLATION_LANGUAGES.slice(0, 12);
  return TRANSLATION_LANGUAGES;
}

export default function Lesson({ current, loading, onSummary, onQuiz, onNotice, token, saveContent, activePlan }) { 
  const [tab, setTab] = useState(current?.summary ? "Summary" : "Transcript"); 
  
  const [targetLang, setTargetLang] = useState(current?.englishTranslation ? "English" : "");
  const [translatedText, setTranslatedText] = useState(current?.englishTranslation || "");
  const [isTranslating, setIsTranslating] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const audioRef = useRef(null);

  const handleSpeak = async () => {
    // If speaking, stop it
    if (isSpeaking) {
      window.__currentTTSId = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    if (!translatedText) return;

    const webSpeechLangs = ["English", "Hindi", "Chinese", "Japanese", "Spanish", "French", "German"];
    const sarvamLangs = ["Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati", "Punjabi", "Malayalam", "Odia", "Arabic"];

    if (webSpeechLangs.includes(targetLang) || (!webSpeechLangs.includes(targetLang) && !sarvamLangs.includes(targetLang))) {
      // 1. WEB SPEECH API ROUTE
      const utterance = new SpeechSynthesisUtterance(translatedText);
      
      const langMap = {
        "English": "en",
        "Hindi": "hi",
        "Chinese": "zh",
        "Japanese": "ja",
        "French": "fr",
        "Spanish": "es",
        "German": "de"
      };
      
      const prefix = langMap[targetLang] || "en";
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(prefix) || v.lang.startsWith(prefix.toLowerCase()));
      
      if (voice) {
        utterance.voice = voice;
      } else {
        utterance.lang = prefix; 
      }
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);

    } else if (sarvamLangs.includes(targetLang)) {
      // 2. SARVAM AI HYBRID ROUTE
      window.__currentTTSId = Date.now();
      const currentSession = window.__currentTTSId;
      
      const chunks = [];
      const sentences = translatedText.match(/[^.!?]+[.!?]*/g) || [translatedText];
      let currentChunk = "";
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length < 450) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
      
      const fetchChunk = async (index) => {
        if (index >= chunks.length || window.__currentTTSId !== currentSession) return null;
        return api("/learning/tts", {
          token, method: "POST",
          body: { text: chunks[index], targetLang, contentId: current.id }
        }).catch(err => { throw err; });
      };

      try {
        setIsTtsLoading(true);
        setIsSpeaking(true); // show stop button immediately
        let nextFetchPromise = fetchChunk(0);
        
        for (let i = 0; i < chunks.length; i++) {
          if (window.__currentTTSId !== currentSession) break;
          
          const res = await nextFetchPromise;
          setIsTtsLoading(false); // hide spinner after first chunk loads
          
          // Eagerly fetch the next chunk for optimal performance while this one plays
          nextFetchPromise = fetchChunk(i + 1); 
          
          if (window.__currentTTSId !== currentSession) break;

          if (res && res.audio) {
            const audio = new Audio("data:audio/wav;base64," + res.audio);
            audioRef.current = audio;
            await new Promise((resolve) => {
              audio.onended = resolve;
              audio.onerror = resolve;
              audio.play();
            });
          }
        }
      } catch (err) {
        console.error("Sarvam TTS Error:", err);
        if (onNotice) onNotice(err.message);
      } finally {
        if (window.__currentTTSId === currentSession) {
          setIsSpeaking(false);
          setIsTtsLoading(false);
        }
      }
    }
  };


  useEffect(() => {
    if (current) {
      setTargetLang(current.englishTranslation ? "English" : "");
      setTranslatedText(current.englishTranslation || "");
    }
  }, [current?.id]);

  const handleTranslate = async (e) => {
    const lang = e.target.value;
    setTargetLang(lang);
    if (!lang) {
      setTranslatedText("");
      return;
    }
    
    if (lang === "English" && current.englishTranslation) {
      setTranslatedText(current.englishTranslation);
      return;
    }
    if (current.translations && current.translations[lang]) {
      setTranslatedText(current.translations[lang]);
      return;
    }
    
    setIsTranslating(true);
    try {
      const res = await api(`/learning/content/${current.id}/translate`, {
        method: "POST",
        token,
        body: { targetLanguage: lang }
      });
      setTranslatedText(res.translation);
      saveContent({
        ...current,
        translations: { ...current.translations, [lang]: res.translation }
      });
    } catch (err) {
      onNotice(err.message);
      setTargetLang("");
      setTranslatedText("");
    } finally {
      setIsTranslating(false);
    }
  };

  if (!current) return <div className="empty-state-large">Select a lesson from your history or create a new one.</div>; 
  
  const tabs = ["Summary", "Transcript", "Flashcards", "Notes", "Quiz", "Ask AI"];
  if (current.latestAnalysis) tabs.push("Analysis");
  const generateFreshQuiz = async (count = 5) => {
    await onQuiz(count);
    setTab("Quiz");
  };



  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if(current?.transcript) {
        navigator.clipboard.writeText(current.transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  
  const getAppDarkMode = () => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      document.body?.classList.contains("dark")
    );
  };
  const [isDarkMode, setIsDarkMode] = useState(getAppDarkMode);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => setIsDarkMode(getAppDarkMode());
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const wordCount = current?.transcript ? current.transcript.split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{current.title}</h1>
      <div className={`rounded-2xl p-5 mb-8 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}`}>
        
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${current.sourceType === "youtube_url" ? (isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600") : (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600")}`}>
            {current.sourceType === "youtube_url" ? <PlaySquare size={14} /> : <Video size={14} />}
            {current.sourceType === "youtube_url" ? "YouTube" : "Media Upload"}
          </div>
          
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isDarkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
            <Globe size={14} />
            {current.language}
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>
            <FileText size={14} />
            {wordCount.toLocaleString()} Words
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
            <Clock size={14} />
            {readingTime} Min Read
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {current.sourceUrl && (
            <a 
              href={current.sourceUrl} 
              target="_blank" 
              rel="noreferrer"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">Source</span>
            </a>
          )}
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Transcript"}</span>
          </button>
        </div>

      </div>
      <div className="tabs">
        {tabs.map((item) => (
          <button className={tab === item ? "selected" : ""} key={item} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === "Summary" && (
        <article className="paper">
          {current.summary ? <><div className="content-action-row"><span>Generated from this lesson transcript</span><button className="quiz-refresh" onClick={onSummary} disabled={loading}>{loading ? <LoadingLabel label="Refreshing summary" /> : <><RefreshCw size={15} /> Refresh summary</>}</button></div><div className="markdown-prose"><ReactMarkdown>{current.summary}</ReactMarkdown></div></> : (
            <div className="empty-state-large">
              <div className="empty-icon">📝</div>
              <h3>No Summary Yet</h3>
              <p>Generate a detailed summary to turn this transcript into structured notes.</p>
              <button className="primary" onClick={onSummary} disabled={loading}>{loading ? <LoadingLabel label="Generating summary" /> : "Generate Summary Now"}</button>
            </div>
          )}
        </article>
      )}
        {tab === "Transcript" && (
          <div className="flex flex-col gap-6">
            {current.sourceUrl && (
              <div className="w-full h-80 md:h-96 rounded-xl overflow-hidden shadow-sm bg-slate-900 flex justify-center items-center">
                {current.sourceType === "youtube_url" ? (
                  <iframe 
                    className="w-full h-full"
                    src={getYoutubeEmbedUrl(current.sourceUrl)}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video 
                    controls 
                    className="w-full h-full object-contain bg-black"
                    src={current.sourceUrl}
                  ></video>
                )}
              </div>
            )}
            <article className={`transcript-workspace with-translation`}>
              <section className="transcript-column">
                <div className="transcript-column-head"><span className="transcript-icon"><MessageCircle size={17} /></span><div><p>ORIGINAL LANGUAGE</p><h2>Original transcript</h2></div></div>
                <div className="transcript-scroll"><p>{current.transcript}</p></div>
              </section>
          <section className="transcript-column translation-column">
            <div className="transcript-column-head">
              <span className="transcript-icon"><Sparkles size={17} /></span>
              <div className="flex-1 flex justify-between items-center">
                <div><p>ACCESSIBILITY VIEW</p><h2>Translation</h2></div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={handleSpeak}
                    disabled={isTranslating || !translatedText}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors border shadow-sm flex items-center justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} disabled:opacity-50`}
                    title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                  >
                    {isTtsLoading ? <LoaderCircle size={18} className="animate-spin" /> : (isSpeaking ? <Square size={18} className={isDarkMode ? "fill-slate-300" : "fill-slate-700"} /> : <Volume2 size={18} />)}
                  </button>
                  <select 
                  value={targetLang} 
                  onChange={handleTranslate}
                  disabled={isTranslating}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select language</option>
                  {getLanguagesForPlan(activePlan).map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                </div>
              </div>
            </div>
            <div className="transcript-scroll">
              {isTranslating ? (
                <div className="w-full space-y-3 animate-pulse p-2">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-11/12"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </div>
              ) : translatedText ? (
                <p>{translatedText}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Sparkles size={32} className="mb-4 opacity-50" />
                  <p>Select a language from the dropdown to translate this transcript.</p>
                </div>
              )}
            </div>
            </section>
          </article>
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            Translation may take time if the video is large. Please wait and enjoy your video.
          </div>
        </div>
      )}
      {tab === "Flashcards" && <Flashcards current={current} token={token} saveContent={saveContent} onNotice={onNotice} />}
      {tab === "Notes" && <Notes current={current} token={token} saveContent={saveContent} onNotice={onNotice} />}
      {tab === "Quiz" && <Quiz current={current} token={token} saveContent={saveContent} onNotice={onNotice} onQuiz={generateFreshQuiz} loading={loading} />}
      {tab === "Ask AI" && <RagChat current={current} token={token} onNotice={onNotice} saveContent={saveContent} />}
      {tab === "Analysis" && <Analysis analysis={current.latestAnalysis} />}
    </div>
  );
}

function Quiz({ current, token, saveContent, onNotice, onQuiz, loading }) { 
  const [answers, setAnswers] = useState({}); 
  const [result, setResult] = useState(current.latestAnalysis); 
  const [evaluating, setEvaluating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Ensure the displayed count is always a valid option (5, 10, 15)
  const currentCount = current.quiz?.questions?.length || 5;
  const displayCount = [5, 10, 15].includes(currentCount) ? currentCount : 5;

  useEffect(() => { setAnswers({}); setResult(current.latestAnalysis); }, [current.quiz?.quizId, current.latestAnalysis]);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
  
  return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  if (!current.quiz?.questions?.length) {
  
  return (
        <div className="empty-state-large">
          <div className="empty-icon">🧠</div>
          <h3>Test Your Knowledge</h3>
          <p>Generate a quiz to practice the concepts in this lesson.</p>
          <button className="primary" onClick={() => onQuiz(5)} disabled={loading}>{loading ? <LoadingLabel label="Generating quiz" /> : "Generate Quiz Now"}</button>
        </div>
    );
  }
  
  async function submit(event) { 
    event.preventDefault(); 
    setEvaluating(true);
    try { 
      const payload = current.quiz.questions.map((question) => ({ 
        question_id: question.question_id, 
        answer: answers[question.question_id] || "" 
      })); 
      const analysis = await api(`/learning/content/${current.id}/evaluate`, { token, method: "POST", body: { answers: payload } }); 
      setResult(analysis); 
      saveContent({ ...current, latestAnalysis: analysis }); 
    } catch (err) { 
      onNotice(err.message); 
    } finally { setEvaluating(false); }
  } 
  
  return (
      <form className="quiz" onSubmit={submit}>
        <div className="quiz-heading">
          <div>
            <p>KNOWLEDGE CHECK</p>
            <h2>Practice this lesson</h2>
            <span>Each quiz is created fresh from the selected transcript.</span>
          </div>
          <div className="flex items-center gap-3">
            
            <div className="relative" ref={dropdownRef}>
              <button 
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loading}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] shadow-sm"
              >
                <span>{displayCount} Questions</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <div 
                  role="listbox"
                  className="absolute top-full right-0 mt-2 w-full min-w-[140px] bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 py-1.5 z-10 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {[5, 10, 15].map(opt => {
                    const isSelected = displayCount === opt;
                    const isDefault = opt === 5;
                  
  return (
                      <button
                        key={opt}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => { onQuiz(opt); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors focus:bg-slate-50 focus:outline-none
                          ${isSelected ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600 font-medium'}
                        `}
                      >
                        <span className="flex items-center gap-2">
                          {opt} Questions
                          {isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold tracking-wide">DEFAULT</span>}
                        </span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button type="button" className="quiz-refresh shadow-sm border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-all" onClick={() => onQuiz(displayCount)} disabled={loading}>
              {loading ? <LoadingLabel label="Creating quiz" /> : <><RefreshCw size={15} /> Regenerate</>}
            </button>
          </div>
        </div>
        {current.quiz.questions.map((question, index) => (
        <fieldset key={question.question_id}>
          <legend>{index + 1}. {question.question}</legend>
          {question.options.map((option) => {
            const hasAnswered = !!answers[question.question_id];
            const isSelected = answers[question.question_id] === option;
            const isCorrect = option === question.correct_answer;

            let className = "";
            if (hasAnswered) {
              className = "disabled";
              if (isCorrect) className += " correct";
              else if (isSelected) className += " incorrect";
            }

          
  return (
              <label key={option} className={className.trim()}>
                <input type="radio" name={question.question_id} value={option} 
                  disabled={hasAnswered}
                  checked={isSelected}
                  onChange={() => setAnswers({ ...answers, [question.question_id]: option })} /> {option}
              </label>
            );
          })}
        </fieldset>
      ))}
      <button className="primary" disabled={evaluating}>{evaluating ? <LoadingLabel label="Evaluating" /> : "Evaluate answers"}</button>
      {result && <Analysis analysis={result} />}
    </form>
  ); 
}

function RagChat({ current, token, onNotice, saveContent }) {
  const [messages, setMessages] = useState(
    current.chatHistory?.length > 0 
      ? current.chatHistory 
      : [{ role: "assistant", text: "Ask about this lesson. I'll answer only from its transcript." }]
  );
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || sending) return;
    setQuestion(""); 
    setMessages((items) => [...items, { role: "user", text }]); 
    setSending(true);
    try {
      const result = await api(`/learning/content/${current.id}/chat`, { token, method: "POST", body: { question: text } });
      const cleanAnswer = result.answer.replace(/[*#]/g, '').replace(/--/g, '');
      
      setMessages((items) => {
        const newMessages = [...items, { role: "assistant", text: cleanAnswer, source: result.retrieved_context?.[0] }];
        if (saveContent) saveContent({ ...current, chatHistory: newMessages });
        return newMessages;
      });
    } catch (error) { onNotice(error.message); } finally { setSending(false); }
  }


  return (
    <section className="rag-panel">
      <div className="rag-head">
        <span><Bot size={20} /></span>
        <div><p>RAG CHATBOT</p><h2>Ask your lesson tutor</h2><small>Answers are grounded in {current.title}.</small></div>
      </div>
      <div className="rag-messages">
        {messages.map((message, index) => (
          <div className={`rag-message ${message.role}`} key={index}>
            <p>{message.text}</p>
            {message.source && <small>Based on retrieved lesson context</small>}
          </div>
        ))}
        {sending && (
          <div className="rag-message typing" aria-label="Tutor is preparing a response">
            <LoadingLabel label="Finding an answer" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-slate-200 bg-white rounded-b-xl">
        <form className="rag-form" style={{ borderTop: 'none', paddingBottom: '8px' }} onSubmit={submit}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={sending} placeholder="Ask a question about this lesson" />
          <button className="primary" disabled={sending} aria-label="Send question">{sending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}</button>
        </form>
        <p className="text-[11px] text-slate-400 pb-3 text-center font-medium">KnowLearn can make mistakes. Verify important info.</p>
      </div>
    </section>
  );
}

function LoadingLabel({ label }) {
  return <span className="loading-label"><LoaderCircle className="spin" size={15} /> {label}</span>;
}

function Analysis({ analysis }) { 
  if (!analysis) return null; // Analysis tab is hidden if not present, so we don't need a large empty state here.

  return (
    <section className="analysis">
      <div className="analysis-header">
        <div className="score-card">
          <strong>{analysis.accuracy_percent}%</strong>
          <span>Estimated Grasping Level</span>
          <div style={{marginTop: "0.5rem", fontWeight: 600, color: "var(--primary-dark)"}}>{analysis.estimated_grasping_level}</div>
        </div>
      </div>
      <div className="concept-bars">
        <h3 style={{marginBottom: "1.5rem"}}>Concept Mastery</h3>
        {Object.entries(analysis.concept_accuracy || {}).map(([concept, score]) => (
          <p key={concept}>
            <b>{concept}</b>
            <i><em style={{ width: `${score}%` }} /></i>
            <span style={{width: "40px", textAlign: "right"}}>{score}%</span>
          </p>
        ))}
      </div>
      {analysis.improvement_suggestions?.[0] && (
        <div className="suggestion">
          <strong>💡 Suggestion:</strong> {analysis.improvement_suggestions[0]}
        </div>
      )}
      <small style={{color: "var(--text-tertiary)"}}>{analysis.disclaimer}</small>
    </section>
  ); 
}
