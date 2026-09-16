import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  ArrowUp,
  Sparkles,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import { api } from "../api";
import { Play as PlayIcon } from "lucide-react";

export default function Dashboard({
  content,
  upload,
  loading,
  open,
  session,
  onLearn,
  setTranslatedDoc,
  setPage
}) {
  const [activeModal, setActiveModal] = useState(null); // 'upload' | 'link' | 'document' | 'upgrade'
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  /*
   * ============================================================
   * APP THEME DETECTION
   * ============================================================
   *
   * IMPORTANT:
   * We are NOT using:
   *
   * window.matchMedia("(prefers-color-scheme: dark)")
   *
   * because your application already has its own Light/Dark
   * mode functionality.
   *
   * The dashboard follows the `dark` class used by the app.
   */

  const getAppDarkMode = () => {
    if (typeof document === "undefined") {
      return false;
    }

    return (
      document.documentElement.classList.contains("dark") ||
      document.body?.classList.contains("dark")
    );
  };

  const [isDarkMode, setIsDarkMode] = useState(getAppDarkMode);

  /*
   * Watch for changes to the application's theme class.
   *
   * When your existing theme toggle changes:
   *
   * Light:
   * <html>
   *
   * Dark:
   * <html class="dark">
   *
   * this component automatically updates.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateTheme = () => {
      setIsDarkMode(getAppDarkMode());
    };

    updateTheme();

    const observer = new MutationObserver(() => {
      updateTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeModal) {
      setSelectedFile(null);
    }
  }, [activeModal]);

  useEffect(() => {
    if (selectedFile && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(selectedFile);
      fileInputRef.current.files = dt.files;
    }
  }, [selectedFile, dragActive]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setDragActive(false);
    }
  };

  const handleUploadSubmit = (e) => {
    upload(e);
    setActiveModal(null);
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    setDocError("");

    const formData = new FormData(e.target);
    const file = formData.get("file");
    const targetLanguage = formData.get("target_language");

    if (!file || !targetLanguage) {
      setDocError("Please provide both a file and a target language.");
      return;
    }

    setDocLoading(true);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("target_language", targetLanguage);

      const result = await api("/learning/translate/document", {
        method: "POST",
        body: data,
        token: session.token
      });

      setTranslatedDoc(result);
      setPage("DocumentPreview");
      setActiveModal(null);
    } catch (err) {
      setDocError(err.message || "Failed to translate document.");
    } finally {
      setDocLoading(false);
    }
  };

  const activePlan = session?.user?.activePlan || "Free";

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  const GreetingIcon =
    hour < 12
      ? Sun
      : hour < 18
        ? Sun
        : Moon;

  const handleDocumentClick = () => {
    if (activePlan === "Premium") {
      setActiveModal("document");
    } else {
      setActiveModal("upgrade");
    }
  };

  /*
   * ============================================================
   * THEME CLASSES
   * ============================================================
   *
   * These are controlled by YOUR APP THEME,
   * not the operating system.
   */

  const actionCardClass = isDarkMode
    ? "bg-slate-800 text-white shadow-[0_2px_16px_rgba(0,0,0,0.30)]"
    : "bg-white text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,0.12)]";

  const cardHeadingClass = isDarkMode
    ? "text-white"
    : "text-slate-900";

  const cardDescriptionClass = isDarkMode
    ? "text-slate-400"
    : "text-slate-500";

  const blueIconClass = isDarkMode
    ? "bg-blue-500/10 text-blue-400"
    : "bg-blue-50 text-blue-600";

  const amberIconClass = isDarkMode
    ? "bg-amber-500/10 text-amber-400"
    : "bg-amber-50 text-amber-500";

  const popularBadgeClass = isDarkMode
    ? "bg-blue-900/50 text-blue-300"
    : "bg-blue-100 text-blue-100";

  const searchClass = isDarkMode
    ? "bg-slate-900/80 text-white border-slate-800 placeholder:text-slate-400"
    : "bg-white text-slate-900 border-slate-200 placeholder:text-slate-400 shadow-[0_6px_20px_rgba(15,23,42,0.08)]";

  const recentSectionClass = isDarkMode
    ? "bg-slate-800 shadow-[0_2px_16px_rgba(0,0,0,0.30)]"
    : "bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)]";

  const recentHoverClass = isDarkMode
    ? "hover:bg-slate-700/60"
    : "hover:bg-slate-50";

  const recentTitleClass = isDarkMode
    ? "text-white"
    : "text-slate-900";

  const recentDescriptionClass = isDarkMode
    ? "text-slate-300"
    : "text-slate-500";

  return (
    <div className="dashboard-modern animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">

      <main className="dashboard-content">

        {/* ============================================================
            GREETING
            ============================================================ */}

        <h1 className="hero-title flex items-center gap-3 text-3xl md:text-4xl font-bold tracking-tight mb-8">
          <GreetingIcon
            className="text-amber-500 animate-pulse"
            size={32}
          />

          {greeting},{" "}
          {session?.user?.name?.toUpperCase().split(" ")[0] || "User"}!
        </h1>


        {/* ============================================================
            ACTION CARDS
            ============================================================ */}

        <div className="action-cards grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 ml-16">

          {/* UPLOAD */}
          <button
            className={`action-card group relative overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ${actionCardClass} hover:shadow-[0_12px_32px_rgba(59,130,246,0.18)] backdrop-blur-md rounded-2xl p-6 text-left`}
            onClick={() => setActiveModal("upload")}
          >

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div
              className={`popular-badge absolute top-4 right-4 ${popularBadgeClass} text-xs font-bold px-2 py-1 rounded-full`}
            >
              Popular
            </div>

            <div
              className={`card-icon w-12 h-12 rounded-xl ${blueIconClass} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}
            >
              <Upload size={24} />
            </div>

            <h3
              className={`font-bold text-lg ${cardHeadingClass} mb-1`}
            >
              Upload
            </h3>

            <p
              className={`text-sm ${cardDescriptionClass}`}
            >
              File, audio, video
            </p>

          </button>


          {/* LINK */}
          <button
            className={`action-card group relative overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ${actionCardClass} hover:shadow-[0_12px_32px_rgba(59,130,246,0.18)] backdrop-blur-md rounded-2xl p-6 text-left`}
            onClick={() => setActiveModal("link")}
          >

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div
              className={`card-icon w-12 h-12 rounded-xl ${blueIconClass} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}
            >
              <LinkIcon size={24} />
            </div>

            <h3
              className={`font-bold text-lg ${cardHeadingClass} mb-1`}
            >
              Link
            </h3>

            <p
              className={`text-sm ${cardDescriptionClass}`}
            >
              YouTube, Website
            </p>

          </button>


          {/* DOCUMENT */}
          <button
            className={`action-card group relative overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ${actionCardClass} hover:shadow-[0_12px_32px_rgba(245,158,11,0.18)] backdrop-blur-md rounded-2xl p-6 text-left`}
            onClick={handleDocumentClick}
          >

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10">
              <Sparkles size={10} />
              PREMIUM
            </div>

            <div
              className={`card-icon w-12 h-12 rounded-xl ${amberIconClass} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}
            >
              <FileText size={24} />
            </div>

            <h3
              className={`font-bold text-lg ${cardHeadingClass} mb-1`}
            >
              Document
            </h3>

            <p
              className={`text-sm ${cardDescriptionClass}`}
            >
              Translate PPTX / DOCX
            </p>

          </button>

        </div>


        {/* ============================================================
            SEARCH
            ============================================================ */}

        <form
          className="search-palette relative group w-full max-w-3xl mx-auto mb-12"
          onSubmit={(event) => {
            event.preventDefault();

            const query = new FormData(event.currentTarget)
              .get("learnQuery")
              ?.trim();

            if (query) {
              onLearn(query);
            }
          }}
        >

          <input
            name="learnQuery"
            type="text"
            placeholder="Learn anything with your lesson library..."
            className={`w-full pl-6 pr-24 py-4 rounded-2xl ${searchClass} backdrop-blur-md border focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-sm focus:shadow-2xl transition-all duration-300 text-lg group-hover:shadow-md outline-none`}
          />

          <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-50 pointer-events-none">

            <kbd
              className={`px-2 py-1 rounded border text-xs font-semibold ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-400"
                  : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              ⌘K
            </kbd>

          </div>

          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-md"
            aria-label="Ask Learn Anything"
          >
            <ArrowUp size={20} />
          </button>

        </form>


        {/* ============================================================
            RECENTS
            ============================================================ */}

        <div className="sections-grid w-full">

          <section
            className={`dashboard-section ${recentSectionClass} backdrop-blur-lg rounded-3xl p-6`}
          >

            <div className="section-header-flex flex items-center justify-between mb-6">

              <div className="flex items-center gap-4">

                <h2
                  className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  Recents
                </h2>

                {/* Activity Sparkline */}
                <div
                  className={`hidden sm:flex items-end gap-[3px] h-6 px-3 rounded-lg pb-1 opacity-80 ${
                    isDarkMode
                      ? "bg-blue-500/10"
                      : "bg-blue-50"
                  }`}
                  title="Learning Activity"
                >

                  {[4, 7, 3, 8, 5, 10, 6].map((h, i) => (
                    <div
                      key={i}
                      className={`w-[5px] rounded-t-[2px] animate-in fade-in zoom-in slide-in-from-bottom-2 ${
                        isDarkMode
                          ? "bg-blue-400"
                          : "bg-blue-500"
                      }`}
                      style={{
                        height: `${h * 10}%`,
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                  ))}

                </div>

              </div>


              <button
                className={`view-all text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-700"
                }`}
                onClick={() => setPage("History")}
              >
                View all &rarr;
              </button>

            </div>


            <div className="recent-list flex flex-col gap-2">

              {!content ? (

                /* Shimmering Skeletons */

                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-2xl animate-pulse ${
                      isDarkMode
                        ? "bg-slate-700/50"
                        : "bg-slate-50"
                    }`}
                  >

                    <div
                      className={`w-10 h-10 rounded-xl ${
                        isDarkMode
                          ? "bg-slate-700"
                          : "bg-slate-200"
                      }`}
                    />

                    <div className="flex-1 space-y-2">

                      <div
                        className={`h-4 rounded w-1/3 ${
                          isDarkMode
                            ? "bg-slate-700"
                            : "bg-slate-200"
                        }`}
                      />

                      <div
                        className={`h-3 rounded w-1/4 ${
                          isDarkMode
                            ? "bg-slate-700"
                            : "bg-slate-200"
                        }`}
                      />

                    </div>

                  </div>
                ))

              ) : content.length ? (

                content.slice(0, 5).map((item) => (

                  <button
                    key={item.id}
                    className={`recent-item flex items-center gap-4 p-4 rounded-2xl ${recentHoverClass} transition-colors text-left group`}
                    onClick={() => open(item.id)}
                  >

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                        isDarkMode
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <PlayIcon
                        size={16}
                        className="ml-1"
                      />
                    </div>


                    <div className="flex-1 overflow-hidden">

                      <h4
                        className={`font-semibold truncate ${recentTitleClass}`}
                      >
                        {item.title}
                      </h4>

                      <p
                        className={`text-sm truncate ${recentDescriptionClass}`}
                      >
                        {item.sourceType === "youtube_url"
                          ? "YouTube"
                          : "Media"}{" "}
                        &bull; {item.language}
                      </p>

                    </div>

                  </button>

                ))

              ) : (

                <div
                  className={`empty-state p-8 text-center rounded-2xl text-sm ${
                    isDarkMode
                      ? "bg-slate-700/50 text-slate-300"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  No recent lessons. Start by uploading content.
                </div>

              )}

            </div>

          </section>

        </div>

      </main>


      {/* ================================================================
          MODALS
          ================================================================ */}

      {activeModal && (

        <div className="modal-backdrop z-50">

          <div className="modal-content relative">

            <button
              className="modal-close absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setActiveModal(null);
                setDocError("");
              }}
            >
              <XIcon />
            </button>


            {/* ==========================================================
                UPGRADE MODAL
                ========================================================== */}

            {activeModal === "upgrade" && (

              <div className="flex flex-col items-center text-center p-6">

                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <Sparkles size={32} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Premium Feature
                </h2>

                <p className="text-slate-500 mb-6">
                  Document translation is exclusively available for Premium
                  members. Upgrade to translate PowerPoint files instantly
                  with exact styling.
                </p>

                <button
                  onClick={() => setPage("PlanPricing")}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-200 transition-colors"
                >
                  View Plans
                </button>

              </div>

            )}


            {/* ==========================================================
                DOCUMENT MODAL
                ========================================================== */}

            {activeModal === "document" && (

              <div className="p-2">

                <div className="flex items-center justify-between mb-6">

                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">

                    <FileText
                      className="text-amber-500"
                      size={24}
                    />

                    Translate Document

                  </h2>

                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {(session?.user?.docUploadsToday?.count || 0)} / 1 Used Today
                  </div>

                </div>


                {docError && (

                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm border border-red-100">

                    <AlertCircle
                      size={16}
                      className="flex-shrink-0"
                    />

                    <span>
                      {docError}
                    </span>

                  </div>

                )}


                <form
                  onSubmit={handleDocumentSubmit}
                  className="flex flex-col gap-5"
                >

                  <label className="flex flex-col gap-2">

                    <span className="font-semibold text-sm text-slate-700">
                      Choose .pptx or .docx file
                    </span>

                    <input
                      name="file"
                      type="file"
                      accept=".pptx,.docx"
                      required
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                  </label>


                  <label className="flex flex-col gap-2">

                    <span className="font-semibold text-sm text-slate-700">
                      Target Language
                    </span>

                    <select
                      name="target_language"
                      required
                      defaultValue="English"
                      className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >

                      <option value="English">
                        English
                      </option>

                      <optgroup label="Indian Languages">

                        <option value="Hindi">Hindi</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Odia">Odia</option>

                      </optgroup>

                      <optgroup label="Global Languages">

                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                        <option value="French">French</option>
                        <option value="Spanish">Spanish</option>
                        <option value="German">German</option>

                      </optgroup>

                    </select>

                  </label>


                  <button
                    type="submit"
                    disabled={
                      docLoading ||
                      (session?.user?.docUploadsToday?.count >= 1)
                    }
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
                  >

                    {docLoading ? (

                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Translating...
                      </>

                    ) : (

                      "Translate Document"

                    )}

                  </button>

                  <p className="text-xs text-center text-slate-400">
                    Powered by GPT-5.6-Luna
                  </p>

                </form>

              </div>

            )}


            {/* ==========================================================
                UPLOAD / LINK MODAL
                ========================================================== */}

            {(activeModal === "upload" || activeModal === "link") && (

              <div className="p-2">

                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  {activeModal === "upload"
                    ? "Upload Media"
                    : "Link YouTube URL"}
                </h2>

                <form
                  onSubmit={handleUploadSubmit}
                  className="flex flex-col gap-5"
                >

                  <label className="flex flex-col gap-2">

                    <span className="font-semibold text-sm text-slate-700">
                      Lesson title
                    </span>

                    <input
                      name="title"
                      placeholder="e.g. Introduction to SQL"
                      required
                      className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                  </label>


                  {activeModal === "upload" ? (

                    <label
                      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        dragActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={(e) => {
                        handleDrag(e);

                        if (e.dataTransfer.files?.length) {
                          setSelectedFile(e.dataTransfer.files[0]);
                        }
                      }}
                    >

                      {selectedFile ? (

                        <>
                          <FileText
                            className="text-blue-500 mb-3"
                            size={32}
                          />

                          <span className="font-semibold text-sm text-slate-700">
                            {selectedFile.name}
                          </span>

                          <span className="text-xs text-blue-500 mt-1 font-medium">
                            Click to change file
                          </span>
                        </>

                      ) : (

                        <>
                          <Upload
                            className={`${
                              dragActive
                                ? "text-blue-500"
                                : "text-slate-400"
                            } mb-3`}
                            size={32}
                          />

                          <span className="font-semibold text-sm text-slate-700">
                            Drag & drop or click to choose media
                          </span>

                          <span className="text-xs text-slate-500 mt-1">
                            Audio or Video files supported
                          </span>
                        </>

                      )}

                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        name="file"
                        type="file"
                        accept="audio/*,video/*"
                        required
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />

                    </label>

                  ) : (

                    <label className="flex flex-col gap-2">

                      <span className="font-semibold text-sm text-slate-700">
                        YouTube URL
                      </span>

                      <input
                        name="youtubeUrl"
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        required
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                    </label>

                  )}


                  <button
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
                    disabled={loading}
                  >

                    {loading ? (

                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>

                    ) : (

                      "Create learning material"

                    )}

                  </button>

                </form>

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}


function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
      />

      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      />
    </svg>
  );
}