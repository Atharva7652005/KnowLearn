import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Mail, Monitor, Moon, Palette, Save, Sun, UserRound, Shield, Database, Headset, Trash2, Star, Search } from "lucide-react";
import { api } from "../api";

const preferencesKey = "knowlearn_preferences";

export default function Profile({ session, content = [], onUserUpdate, onNotice, onDeleteContent, openLesson, logout }) {
  const [activeTab, setActiveTab] = useState("general");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Data
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const filteredContent = useMemo(() => content.filter(item => item.title?.toLowerCase().includes(historySearchQuery.toLowerCase())), [content, historySearchQuery]);
  
  // General
  const [name, setName] = useState(session.user.name);
  const [avatarBase64, setAvatarBase64] = useState(session.user.avatarBase64 || "");
  const [savingGeneral, setSavingGeneral] = useState(false);
  
  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState(() => {
    try { return JSON.parse(localStorage.getItem(preferencesKey)) || { theme: "light", compact: false, dailyGoal: "3" }; }
    catch { return { theme: "light", compact: false, dailyGoal: "3" }; }
  });

  

  const stats = useMemo(() => ({ contents: content.length, summaries: content.filter((item) => item.summary).length, quizzes: content.filter((item) => item.quiz?.questions?.length).length }), [content]);

  useEffect(() => {
    const isDark = preferences.theme === "dark" || (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.dataset.density = preferences.compact ? "compact" : "comfortable";
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }, [preferences]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setAvatarBase64(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  async function updateGeneral(event) {
    event.preventDefault(); setSavingGeneral(true);
    try { 
      const result = await api("/users/profile", { token: session.token, method: "PATCH", body: { name, avatarBase64 } }); 
      onUserUpdate(result.user); 
      onNotice("Your profile has been updated."); 
    }
    catch (error) { onNotice(error.message); }
    finally { setSavingGeneral(false); }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) return onNotice("New passwords do not match.");
    setSavingPassword(true);
    try {
      const result = await api("/users/profile/password", { token: session.token, method: "PATCH", body: { currentPassword, newPassword } });
      onNotice(result.message);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error) { onNotice(error.message); }
    finally { setSavingPassword(false); }
  }

  async function handleDeleteAccount() {
    try {
      await api("/users/profile", { token: session.token, method: "DELETE" });
      onNotice("Account and data deleted successfully.");
      logout();
    } catch (error) {
      onNotice(error.message);
    }
  }

  const tabs = [
    { id: "general", label: "General & Identity", icon: UserRound },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "data", label: "Data & History", icon: Database },
    { id: "support", label: "Support & Extras", icon: Headset },
  ];

  return (
    <div className="utility-page profile-page">
      <section className="utility-hero">
        <span className="utility-icon"><UserRound /></span>
        <div>
          <p>ACCOUNT SETTINGS</p>
          <h1>Your profile</h1>
          <span>Manage your learning workspace, preferences, and personal details.</span>
        </div>
      </section>
      
      <section className="account-stats" aria-label="Learning activity">
        <article><BookOpen /><strong>{stats.contents}</strong><span>Contents created</span></article>
        <article><Check /><strong>{stats.summaries}</strong><span>Summaries generated</span></article>
        <article><Palette /><strong>{stats.quizzes}</strong><span>Quizzes created</span></article>
      </section>
      
      <div className="account-hub mt-6">
        {/* Navigation Sidebar */}
        <aside className="account-sidebar flex-shrink-0">
          <div className="utility-card" style={{ padding: '16px' }}>
            <nav className="account-nav">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={18} /> 
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <div className="account-content account-section">
          
          {activeTab === "general" && (
            <form className="utility-card profile-form w-full max-w-none" onSubmit={updateGeneral} style={{ display: 'flex', flexDirection: 'column', padding: '32px' }}>
              
              {/* Header - Centered as in reference photo */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#4f46e5', marginBottom: '8px' }}>
                  <UserRound size={20} />
                  <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>General Profile</h2>
                </div>
                <p style={{ fontSize: '.84rem', color: 'var(--text-secondary)', margin: 0, marginBottom: '16px' }}>Update your display name and profile picture.</p>
                
                <div style={{ display: 'flex', gap: '12px', padding: '0 8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                  <div className="plan-badge" style={{ padding: '6px 14px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    {session?.user?.activePlan || "Free"} Plan
                  </div>
                  <div className="plan-badge" style={{ padding: '6px 14px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', fontWeight: 'bold' }}>
                    Uploads: {Math.max(0, ({ "Free": 3, "Basic": 10, "Pro": 25, "Premium": 50 }[session?.user?.activePlan || "Free"] || 3) - (session?.user?.uploadsToday?.count || 0))} Remaining
                  </div>
                  <div className="plan-badge" style={{ padding: '6px 14px', borderRadius: '12px', background: '#fce7f3', color: '#be185d', fontWeight: 'bold' }}>
                    {({ "Free": 1, "Basic": 5, "Pro": 10, "Premium": 25 }[session?.user?.activePlan || "Free"] || 1)} AI Regenerations
                  </div>
                  <div className="plan-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff7ed', color: '#ea580c', borderColor: '#ffedd5', padding: '6px 14px', borderRadius: '12px', fontWeight: 'bold' }}>
                    <span style={{ fontSize: '12px' }}>★</span> {session?.user?.rewardsPoints || 0} Points
                  </div>
                </div>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', width: '100%', margin: '0 0 24px 0' }} />
              
              <div style={{ padding: '0 10%' }}>
                {/* Avatar Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
                  <label style={{ position: 'relative', cursor: 'pointer', display: 'block', margin: 0, flexShrink: 0 }}>
                    <div className="profile-avatar-large" style={{ width: '84px', height: '84px', overflow: 'hidden', padding: avatarBase64 ? 0 : undefined, margin: 0, fontSize: '1.6rem' }}>
                      {avatarBase64 ? <img src={avatarBase64} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : session.user.avatarInitials}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: 0, transition: 'opacity 0.2s', fontWeight: 'bold', fontSize: '0.8rem' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      Change
                    </div>
                    <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                  <div>
                    <h3 style={{ fontSize: '.95rem', color: 'var(--text-primary)', margin: '0 0 6px', fontWeight: '600' }}>Profile Picture</h3>
                    <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>Upload a new image to personalize your account.<br/>(Recommended: 250x250px PNG or JPG)</p>
                    <label htmlFor="avatar-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '.82rem', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background = 'var(--bg-main)'}>
                      Choose File
                      <input id="avatar-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', width: '100%', margin: '0 0 24px 0' }} />

                {/* Inputs Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <label style={{ display: 'grid', gap: '7px', fontSize: '.83rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Display name
                    <input value={name} onChange={(event) => setName(event.target.value)} required />
                  </label>
                  
                  <label style={{ display: 'grid', gap: '7px', fontSize: '.83rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Email address
                    <span className="input-with-icon" style={{ display: 'block', position: 'relative' }}>
                      <Mail size={17} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-tertiary)' }} />
                      <input value={session.user.email} disabled style={{ paddingLeft: '36px' }} />
                    </span>
                  </label>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '8px' }}>
                    <button className="btn-primary" disabled={savingGeneral}>
                      <Save size={16} />{savingGeneral ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <form className="utility-card w-full max-w-none" onSubmit={updatePassword}>
                <div className="preference-heading" style={{ marginBottom: '24px' }}>
                  <Shield size={19} />
                  <div><h2>Security</h2><p>Update your password and secure your account.</p></div>
                </div>
                <label style={{ display: 'block', marginBottom: '14px', fontSize: '.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Current Password
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required minLength={8} placeholder="Enter current password" style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'} onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    New Password
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'} onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
                  </label>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    Confirm Password
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="Confirm new password" style={{ width: '100%', marginTop: '6px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'} onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button className="btn-primary" disabled={savingPassword}>
                    <Save size={16} />{savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>

              <div className="utility-card w-full max-w-none" style={{ border: '1px solid #fecaca', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '12px' }}>
                  <Trash2 size={20} />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '600' }}>Delete Account</h3>
                </div>
                <p style={{ fontSize: '.84rem', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>Permanently delete your account and all of your learning history, summaries, and quizzes. This action cannot be undone.</p>
                <button onClick={() => setShowDeleteDialog(true)} type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '.84rem', fontWeight: '700', cursor: 'pointer' }}>
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <section className="utility-card preferences-card w-full max-w-none">
              <div className="preference-heading">
                <Palette size={19} />
                <div><h2>Personalize KnowLearn</h2><p>Choose the workspace that helps you focus.</p></div>
              </div>
              <span className="preference-label">Theme Appearance</span>
              <div className="theme-options">
                {[["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]].map(([value, Icon, label]) => (
                  <button type="button" key={value} className={preferences.theme === value ? "theme-choice active" : "theme-choice"} onClick={() => setPreferences((old) => ({ ...old, theme: value }))}>
                    <Icon size={16} />{label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === "data" && (
            <div className="utility-card w-full max-w-none" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>Data & History</h2>
                  <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', margin: 0 }}>Manage your generated learning material.</p>
                </div>
                
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    placeholder="Search history..." 
                    value={historySearchQuery} 
                    onChange={(e) => setHistorySearchQuery(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '.88rem', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s, background 0.2s' }} 
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
                  />
                </div>
              </div>
              
              <div style={{ padding: '12px 24px', background: 'var(--bg-main)', fontSize: '.82rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                Recent History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredContent.length === 0 && <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '.9rem' }}>No history items found.</p>}
                {filteredContent.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', transition: 'background .2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ cursor: 'pointer', flex: 1, marginRight: '16px' }} onClick={() => openLesson(item.id)}>
                      <strong style={{ display: 'block', fontSize: '.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.title}</strong>
                      <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button 
                      onClick={() => { if(window.confirm("Are you sure you want to delete this lesson?")) onDeleteContent(item.id); }} 
                      style={{ padding: '8px', color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="flex flex-col gap-4 w-full">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="utility-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Star size={28} style={{ color: '#f97316' }} />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Learning Rewards</h4>
                  <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>You have earned <strong style={{ color: '#f97316', fontSize: '1.2rem' }}>{session.user.rewardsPoints || 0}</strong> points. Keep learning to rank up!</p>
                  <button style={{ marginTop: 'auto', padding: '10px', width: '100%', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '.84rem', cursor: 'pointer' }}>View Leaderboard (Coming Soon)</button>
                </div>
              </div>

              <div className="utility-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Need Help?</h4>
                <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>If you encounter any issues, have feedback, or need account assistance, please reach out to our support team.</p>
                <a href="mailto:support@knowlearn.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#eff6ff', color: '#1d4ed8', textDecoration: 'none', borderRadius: '8px', fontSize: '.84rem', fontWeight: '700' }}>
                  <Headset size={16}/> Contact Support
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '20px', width: 'min(400px, 90%)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 12px', fontWeight: '700' }}>Delete Account</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>Are you absolutely sure? This action is permanent and will completely erase all your generated learning content and profile data.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteDialog(false)} style={{ padding: '10px 16px', background: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '.88rem', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteAccount} style={{ padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '.88rem', fontWeight: '700', cursor: 'pointer' }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


