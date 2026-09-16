import { useEffect, useMemo, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { api, API_URL } from "./api";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Lesson from "./pages/Lesson";
import History from "./pages/History";
import Analysis from "./pages/Analysis";
import Profile from "./pages/Profile";
import HelpTools from "./pages/HelpTools";
import Support from "./pages/Support";
import Search from "./pages/Search";
import LearnChat from "./pages/LearnChat";
import PlanPricing from "./pages/PlanPricing";
import DocumentPreview from "./pages/DocumentPreview";
import Sidebar from "./components/Sidebar";
import { Info, X, MessageCircle } from "lucide-react";

function MainApp() {
  const [session, setSession] = useState(() => ({ token: localStorage.getItem("knowlearn_token"), user: null }));
  const [isInitializing, setIsInitializing] = useState(true);
  const [page, setPage] = useState("Dashboard");
  const [content, setContent] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [learnQuery, setLearnQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [translatedDoc, setTranslatedDoc] = useState(null);
  const token = session.token;
  
  const current = useMemo(() => content.find((item) => item.id === selected) || null, [content, selected]);
  
  const refreshContent = useCallback(async () => { 
    if(!token) return;
    const result = await api("/learning/content", { token }); 
    setContent(result.content); 
  }, [token]);
  
  useEffect(() => { 
    if (!token) {
      setIsInitializing(false);
      return; 
    }
    api("/auth/me", { token })
      .then((result) => setSession((old) => ({ ...old, user: result.user })))
      .catch(() => { 
        localStorage.removeItem("knowlearn_token"); 
        setSession({ token: null, user: null }); 
      })
      .finally(() => setIsInitializing(false));
    
    refreshContent().catch((err) => setNotice(err.message)); 
  }, [token, refreshContent]);
  
  function saveContent(item) { 
    setContent((old) => [item, ...old.filter((currentItem) => currentItem.id !== item.id)]); 
    setSelected(item.id); 
  }
  
  async function upload(event) {
    event.preventDefault(); 
    const form = new FormData(event.currentTarget); 
    const youtubeUrl = form.get("youtubeUrl")?.trim();
    if (!form.get("file")?.name && !youtubeUrl) return setNotice("Choose an audio/video file or provide a YouTube URL.");
    
    setLoading(true); 
    const jobId = Date.now().toString() + Math.floor(Math.random() * 1000);
    setUploadProgress({ status: "starting", message: "Connecting to server...", percent: 0 });
    
    const eventSource = new EventSource(`${API_URL}/learning/progress/${jobId}`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setUploadProgress(data);
        if (data.status === "error" || data.percent >= 100) eventSource.close();
      } catch (err) {}
    };

    try {
      const body = form.get("file")?.name ? form : { youtubeUrl, title: form.get("title") };
      const result = await api(`/learning/transcript?jobId=${jobId}`, { token, method: "POST", body }); 
      saveContent(result.content); api("/auth/me", { token }).then((res) => setSession((old) => ({ ...old, user: res.user }))); setPage("Lesson"); setNotice("Learning material is ready. Generate a summary or ask your first question.");
    } catch (err) { 
      setNotice(err.message); 
    } finally { 
      setLoading(false); 
      setUploadProgress(null);
      eventSource.close();
    }
  }
  
  async function generateSummary() { 
    if (!current) return; setLoading(true); 
    try { 
      const result = await api(`/learning/content/${current.id}/summary`, { token, method: "POST" }); 
      saveContent({ ...current, summary: result.summary }); 
    } catch (err) { setNotice(err.message); } finally { setLoading(false); } 
  }
  
  async function generateQuiz(count = 5) { 
    if (!current) return; setLoading(true); 
    try { 
      const result = await api(`/learning/content/${current.id}/quiz`, { token, method: "POST", body: { count } }); 
      saveContent({ ...current, quiz: { quizId: result.quiz_id, questions: result.questions } }); 
    } catch (err) { setNotice(err.message); } finally { setLoading(false); } 
  }
  
  async function deleteContent(id) {
    if (!id) return;
    try {
      await api(`/learning/content/${id}`, { token, method: "DELETE" });
      setContent((old) => old.filter(item => item.id !== id));
      if (selected === id) { setSelected(null); setPage("Dashboard"); }
      setNotice("Learning material deleted.");
    } catch (err) { setNotice(err.message); }
  }

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const logout = () => { localStorage.removeItem("knowlearn_token"); setSession({ token: null, user: null }); setContent([]); window.location.href = "/"; };

  if (isInitializing) {
    return <div className="flex h-screen justify-center items-center text-slate-500 font-medium">Loading your workspace...</div>;
  }

  if (!token || !session.user) {
    return <Navigate to="/login" replace />;
  }
  
  const openLesson = (id) => { 
    const item = content.find(c => c.id === id);
    if (item && item.sourceType === "document") {
      setTranslatedDoc({ documentUrl: item.documentUrl, fileName: item.title });
      setPage("DocumentPreview");
    } else {
      setSelected(id); 
      setPage("Lesson"); 
    }
  };

  return (
    <div className="shell flex h-screen overflow-hidden">
      <Sidebar page={page} setPage={setPage} session={session} logout={logout} content={content} open={openLesson} />
      <main className="workspace flex-1 overflow-y-auto relative min-h-0 h-full">
        
        {notice && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-md w-max card-modern px-5 py-4 flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
            <Info className="text-blue-500 shrink-0" size={20} />
            <p className="text-sm font-semibold text-[var(--text-primary)] pr-2">{notice}</p>
            <button onClick={() => setNotice("")} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-4 p-1 hover:bg-[var(--bg-hover)] rounded-full">
              <X size={16} />
            </button>
          </div>
        )}
        
        {uploadProgress && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100 dark:border-slate-700 relative overflow-hidden">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Processing Video</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{uploadProgress.message || "Working..."}</p>
              
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out relative" style={{ width: `${uploadProgress.percent || 0}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>{uploadProgress.percent || 0}%</span>
                <span>Please wait...</span>
              </div>
            </div>
          </div>
        )}
        
        {page === "Dashboard" && <Dashboard content={content} upload={upload} loading={loading} session={session} open={openLesson} onLearn={(query) => { setLearnQuery(query); setPage("Learn"); }} setTranslatedDoc={setTranslatedDoc} setPage={setPage} />}
        {page === "Lesson" && <Lesson current={current} loading={loading} onSummary={generateSummary} onQuiz={generateQuiz} onNotice={setNotice} token={token} saveContent={saveContent} activePlan={session?.user?.activePlan || "Free"} />}
        {page === "History" && <History content={content} open={openLesson} />}
        {page === "Analysis" && <Analysis content={content} open={openLesson} session={session} token={token} setPage={setPage} />}
        {page === "DocumentPreview" && <DocumentPreview document={translatedDoc} setPage={setPage} />}
        {page === "Profile" && <Profile session={session} content={content} onUserUpdate={(user) => setSession((old) => ({ ...old, user }))} onNotice={setNotice} onDeleteContent={deleteContent} openLesson={openLesson} logout={logout} />}
        {page === "Help" && <HelpTools />}
        {page === "Support" && <Support />}
        {page === "Search" && <Search content={content} open={openLesson} close={() => setPage("Dashboard")} />}
        {page === "Learn" && <LearnChat content={content} token={token} initialQuery={learnQuery} onBack={() => setPage("Dashboard")} onNotice={setNotice} activePlan={session?.user?.activePlan || "Free"} />}
        {page === "PlanPricing" && <PlanPricing session={session} onUserUpdate={(user) => setSession((old) => ({ ...old, user }))} />}
      </main>

      <button 
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 hover:shadow-purple-500/30 transition-all duration-300 z-50 group"
        onClick={() => { setLearnQuery(""); setPage("Learn"); }}
      >
        <MessageCircle size={24} />
        <span className="absolute right-full mr-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity font-semibold">Ask AI Anything</span>
      </button>
    </div>
  );
}

export default function App() {
  const token = localStorage.getItem("knowlearn_token");
  const handleAuthenticated = () => {};

  return (
    <Router>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/app" replace /> : <Landing />} />
        <Route path="/login" element={token ? <Navigate to="/app" replace /> : <Auth onAuthenticated={handleAuthenticated} />} />
        <Route path="/register" element={token ? <Navigate to="/app" replace /> : <Auth onAuthenticated={handleAuthenticated} />} />
        <Route path="/app/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

