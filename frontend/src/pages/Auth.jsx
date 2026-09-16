import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { Mail, Lock, User, ArrowRight, Mic, Bot, Target } from "lucide-react";

export default function Auth({ onAuthenticated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(location.pathname === "/register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0 && otpStep) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, otpStep]);

  async function handleResend() {
    setError(""); setLoading(true);
    try {
      await api("/auth/send-otp", { method: "POST", body: form });
      setCountdown(60);
      setOtp("");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    setMode(location.pathname === "/register" ? "register" : "login");
    setOtpStep(false);
  }, [location.pathname]);

  async function submit(event) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      if (mode === "register" && !otpStep) {
        await api(`/auth/send-otp`, { method: "POST", body: form });
        setOtpStep(true);
        setCountdown(60);
      } else {
        const payload = mode === "register" ? { ...form, otp } : form;
        const result = await api(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: payload });
        localStorage.setItem("knowlearn_token", result.token); 
        onAuthenticated(result);
        navigate("/app");
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="auth-modern">
      <div className="auth-left">
        <div className="auth-brand" onClick={() => navigate("/")} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <img src="/logo.png" alt="KnowLearn" className="auth-logo" style={{ height: '36px', width: 'auto', margin: 0 }} />
          <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>KnowLearn</span>
        </div>
        <div className="auth-hero-text">
          <h1 className="font-display" style={{ color: 'var(--text-primary)' }}>Turn every lecture into learning you can truly grasp.</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Transcripts, structured notes, grounded answers, meaningful practice, and progress you can act on.</p>
        </div>
        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-color)', flexShrink: 0 }}>
              <Mic size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '600' }}>Multilingual transcripts</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Upload video/audio or link a YouTube video.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-color)', flexShrink: 0 }}>
              <Bot size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '600' }}>RAG-powered tutor</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Chat directly with the transcript material.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-color)', flexShrink: 0 }}>
              <Target size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '600' }}>Concept-based insights</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Identify weak areas through AI quizzes.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-card-modern card-modern" style={{ padding: '2.5rem', width: '100%', maxWidth: '440px' }}>
          <div className="auth-header">
            {otpStep ? (
              <>
                <h2 className="font-display">Check your email</h2>
                <p>We have sent an OTP to <strong>{form.email}</strong></p>
              </>
            ) : (
              <>
                <h2 className="font-display">{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
                <p>{mode === "login" ? "Sign in to continue your learning journey." : "Start turning lectures into learning material."}</p>
              </>
            )}
          </div>
          
          <form className="auth-form" onSubmit={submit}>
            {otpStep ? (
              <div className="input-group">
                <label>Verification Code</label>
                <div className="input-wrapper" style={{ padding: '0.25rem' }}>
                  <Lock size={18} className="input-icon" style={{ left: '1rem' }} />
                  <input required maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123456" style={{ letterSpacing: '8px', fontSize: '1.25rem', textAlign: 'center', paddingLeft: '2.5rem' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  {countdown > 0 ? (
                    <span style={{ color: 'var(--text-secondary)' }}>Valid for {countdown}s</span>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={loading} style={{ color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Resend OTP</button>
                  )}
                  <button type="button" onClick={() => { setOtpStep(false); setOtp(""); setError(""); }} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change Email</button>
                </div>
              </div>
            ) : (
              <>
                {mode === "register" && (
                  <div className="input-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                    </div>
                  </div>
                )}
                
                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input required minLength="8" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
                  </div>
                </div>
              </>
            )}
            
            {error && <div className="auth-error">{error}</div>}
            
            <button className="auth-submit-btn" disabled={loading}>
              {loading ? "Please wait..." : (otpStep ? "Verify & Register" : (mode === "login" ? "Sign in" : "Create account"))}
              <ArrowRight size={18} />
            </button>
          </form>
          
          <div className="auth-switch">
            <button onClick={() => navigate(mode === "login" ? "/register" : "/login")}>
              {mode === "login" ? "New to KnowLearn? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
