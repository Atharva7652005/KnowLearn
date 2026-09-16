import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Clock, Play, Box, HelpCircle, MessageSquare, ChevronDown, Settings, LogOut, CreditCard, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function Sidebar({ page, setPage, session, logout, content, open }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("knowlearn_sidebar") === "true");
  const dropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("knowlearn_sidebar", isCollapsed);
    if (isCollapsed && showDropdown) setShowDropdown(false);
  }, [isCollapsed]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className={`sidebar-modern transition-all duration-300 ease-in-out flex flex-col h-full overflow-x-hidden ${isCollapsed ? 'w-20' : 'w-64'}`} style={{ backdropFilter: 'blur(12px)', background: 'var(--bg-glass)', borderRight: '1px solid var(--border-color)' }}>
      
      <div className="flex-1 overflow-y-auto no-scrollbar sidebar-top px-3">
        
        {/* Header row is content-sized (w-fit / inline-flex) so there is no leftover
            row-width for the button to drift into — it always sits gap-3 from the logo. */}
        <div className={`flex items-center mt-6 mb-8 px-1 ${isCollapsed ? 'flex-col justify-center gap-4' : 'w-fit gap-3'}`}>
          <div className="logo-section flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setIsCollapsed(false); navigate("/"); }} title="KnowLearn">
            <img src="/logo.png" alt="KnowLearn Logo" className={`shrink-0 object-contain ${isCollapsed ? "h-8 w-8" : "h-7 w-auto"}`} />
            {!isCollapsed && <span className="font-display font-bold text-xl leading-none text-[var(--text-primary)] whitespace-nowrap">KnowLearn</span>}
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-md border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] shrink-0 flex items-center justify-center">
            {isCollapsed ? <PanelLeftOpen size={16} className="shrink-0" /> : <PanelLeftClose size={16} className="shrink-0" />}
          </button>
        </div>
        
        <button className="add-content-btn btn-gradient transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95 mb-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-0 cursor-pointer" onClick={() => setPage("Dashboard")} title="Add content">
          <Plus size={16} className="shrink-0" /> {!isCollapsed && <span className="whitespace-nowrap">Add content</span>}
        </button>

        <div className="nav-menu flex flex-col gap-1">
          <button className={`nav-item mobile-only flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]`} onClick={() => setPage('Dashboard')} title="Home">
            <Home size={18} className="shrink-0" /> {!isCollapsed && <span className="whitespace-nowrap">Home</span>}
          </button>
          <button className={`nav-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${page === "Search" ? "bg-[var(--primary-light)] text-[var(--primary-color)]" : "text-[var(--text-secondary)]"}`} onClick={() => setPage("Search")} title="Search">
            <Search size={18} className="shrink-0" /> {!isCollapsed && <span className="whitespace-nowrap">Search</span>}
          </button>
          <button className={`nav-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${page === "History" ? "bg-[var(--primary-light)] text-[var(--primary-color)]" : "text-[var(--text-secondary)]"}`} onClick={() => setPage("History")} title="History">
            <Clock size={18} className="shrink-0" /> {!isCollapsed && <span className="whitespace-nowrap">History</span>}
          </button>
          <button className={`nav-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${page === "Analysis" ? "bg-[var(--primary-light)] text-[var(--primary-color)]" : "text-[var(--text-secondary)]"}`} onClick={() => setPage("Analysis")} title="Analysis">
            <Box size={18} className="shrink-0" /> {!isCollapsed && <span className="whitespace-nowrap">Analysis</span>}
          </button>
        </div>

        <div className="sidebar-section mt-8 mb-4">
          {!isCollapsed && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 px-2">Recents</p>}
          <div className="nav-list flex flex-col gap-1">
            {content?.slice(0, 5).map((item) => (
              <button key={item.id} className={`nav-subitem flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm w-full text-left`} onClick={() => open(item.id)} title={item.title}>
                <Play size={14} className="shrink-0" /> {!isCollapsed && <span className="truncate">{item.title}</span>}
              </button>
            ))}
            {(!content || content.length === 0) && !isCollapsed && (
              <span className="text-sm text-[var(--text-muted)] px-3 py-2 whitespace-nowrap">No recent lessons</span>
            )}
            {content?.length > 5 && !isCollapsed && (
              <button className="text-sm font-medium text-slate-500 px-3 py-2 mt-1 hover:text-slate-800 hover:bg-[var(--bg-hover)] rounded-lg text-left transition-colors w-full flex items-center whitespace-nowrap" onClick={() => setPage("History")}>...more</button>
            )}
          </div>
        </div>
      </div>

      <div className={`sidebar-bottom mt-auto shrink-0 border-t border-[var(--border-color)] ${isCollapsed ? 'py-4 flex flex-col items-center bg-transparent' : 'p-3'}`}>
        {!isCollapsed && <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary-color)] border border-blue-500/20 mb-3 ml-1 whitespace-nowrap">{session?.user?.activePlan || "Free"} Plan</div>}
        
        {/* Relative container wrapping both Profile Button and Dropdown Menu */}
        <div className="relative w-full flex justify-center" ref={dropdownRef}>
          
          <div className={`profile-button cursor-pointer flex items-center ${isCollapsed ? 'justify-center rounded-full h-10 w-10 p-0 hover:bg-transparent' : 'gap-3 p-2 rounded-lg hover:bg-[var(--bg-hover)] w-full'} transition-colors bg-transparent`} onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
            } else {
              setShowDropdown(!showDropdown);
            }
          }}>
            <div className={`avatar rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0 border border-[var(--border-color)] ${isCollapsed ? 'h-10 w-10' : 'h-8 w-8'}`}>
              {session?.user?.avatarBase64 ? (
                <img src={session.user.avatarBase64} alt="Avatar" className="w-full h-full object-cover bg-transparent shrink-0" />
              ) : (
                <span className="shrink-0">{session?.user?.avatarInitials}</span>
              )}
            </div>
            {!isCollapsed && <span className="profile-name font-semibold text-[var(--text-primary)] truncate flex-1 text-left">{session?.user?.name}</span>}
            {!isCollapsed && <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${showDropdown ? 'rotate-180' : ''} text-[var(--text-secondary)]`} />}
          </div>
            
          {showDropdown && !isCollapsed && (
            <div 
              className="absolute left-0 w-[210px] p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl z-50 transform origin-bottom-left animate-in zoom-in-95 duration-200 cursor-default" 
              style={{ bottom: "calc(100% + 12px)" }}
              onClick={e => e.stopPropagation()}
            >
               <button onClick={() => { setShowDropdown(false); setPage("Profile"); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                 <Settings size={16} className="shrink-0" /> <span className="whitespace-nowrap">Settings</span>
               </button>
               <button onClick={() => { setShowDropdown(false); setPage("PlanPricing"); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                 <CreditCard size={16} className="shrink-0" /> <span className="whitespace-nowrap">Plan & Pricing</span>
               </button>
               <button onClick={() => { setShowDropdown(false); setPage("Help"); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                 <HelpCircle size={16} className="shrink-0" /> <span className="whitespace-nowrap">Help & Tools</span>
               </button>
               <button onClick={() => { setShowDropdown(false); setPage("Support"); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                 <MessageSquare size={16} className="shrink-0" /> <span className="whitespace-nowrap">Support</span>
               </button>
               <hr className="my-1 border-[var(--border-color)]" />
               <button onClick={() => { logout(); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                 <LogOut size={16} className="shrink-0" /> <span className="whitespace-nowrap">Sign out</span>
               </button>
            </div>
          )}
          
        </div>
      </div>
    </aside>
  );
}