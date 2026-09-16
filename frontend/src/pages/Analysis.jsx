import { Activity, Target, Trophy, TrendingDown, BookOpen, Layers, BarChart3, Bot, ThumbsUp, Database, Sparkles, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { api } from "../api";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function Analysis({ session, token, setPage }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await api("/learning/analytics", { token });
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 flex flex-col items-center justify-center text-slate-500 min-h-screen">
        <Activity size={48} className="animate-spin text-blue-500 mb-4" />
        <h2 className="text-xl font-semibold">Loading your analytics...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 flex flex-col items-center justify-center text-red-500 min-h-screen">
        <TrendingDown size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">Failed to load analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  const activePlan = session?.user?.activePlan || "Free";
  const uploadsToday = session?.user?.uploadsToday?.count || 0;
  const docUploadsToday = session?.user?.docUploadsToday?.count || 0;
  
  const PLAN_CONFIG = {
    Free: { uploads: 1, regen: 1 },
    Basic: { uploads: 10, regen: 5 },
    Pro: { uploads: 25, regen: 10 },
    Premium: { uploads: 50, regen: 25 }
  };
  
  const uploadsLimit = PLAN_CONFIG[activePlan].uploads;
  const regenLimit = PLAN_CONFIG[activePlan].regen;
  const docUploadsLimit = activePlan === 'Premium' ? 1 : 0;
  
  const uploadsPercentage = Math.min((uploadsToday / uploadsLimit) * 100, 100);
  const docUploadsPercentage = docUploadsLimit > 0 ? Math.min((docUploadsToday / docUploadsLimit) * 100, 100) : 0;

  const combinedLangData = {};
  
  Object.keys(analytics.languageDistribution || {}).forEach(lang => {
    combinedLangData[lang] = (combinedLangData[lang] || 0) + analytics.languageDistribution[lang];
  });
  
  Object.keys(analytics.translationFrequency || {}).forEach(lang => {
    combinedLangData[lang] = (combinedLangData[lang] || 0) + analytics.translationFrequency[lang];
  });

  const langData = Object.keys(combinedLangData).map((key) => ({
    name: key,
    value: combinedLangData[key],
  }));

  const engagementData = [
    { name: 'Summaries', count: analytics.totalSummaries },
    { name: 'Quizzes', count: analytics.totalQuizzes },
    { name: 'Flashcards', count: analytics.totalFlashcards },
    { name: 'Notes', count: analytics.totalNotes },
  ];

  const totalFeedback = analytics.feedback.thumbsUp + analytics.feedback.thumbsDown;
  const feedbackScore = totalFeedback > 0 ? Math.round((analytics.feedback.thumbsUp / totalFeedback) * 100) : 0;

  // Format performance trends for chart
  const trendData = (analytics.performanceTrends || []).map((t, i) => ({
    name: `Quiz ${i+1}`,
    score: t.accuracy,
    title: t.title,
    date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  const averageAccuracy = trendData.length 
    ? Math.round(trendData.reduce((sum, t) => sum + t.score, 0) / trendData.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4" style={{ minHeight: '100%', paddingBottom: '60px' }}>
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900 leading-tight">Advanced Analytics</h1>
            <p className="text-slate-500 text-sm font-medium">Insights and performance across your learning workspace.</p>
          </div>
        </div>
        
        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Tier</span>
            <span className="text-sm font-bold text-blue-600">{activePlan} Plan</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI Engine</span>
            <span className="text-sm font-bold text-slate-800">
              {activePlan === 'Premium' ? 'GPT-5.6-Luna' : activePlan === 'Pro' ? 'GPT-4o' : 'GPT-4o-mini'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-semibold mb-1">Total Contents</p>
            <h3 className="text-3xl font-bold text-slate-900">{analytics.totalUploads}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database size={20} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-semibold mb-1">Regenerations</p>
            <h3 className="text-3xl font-bold text-slate-900">{analytics.totalGenerations}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-semibold mb-1">Avg Quiz Score</p>
            <h3 className="text-3xl font-bold text-slate-900">{averageAccuracy}%</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <Target size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-semibold mb-1">Approval Rating</p>
            <h3 className="text-3xl font-bold text-slate-900">{totalFeedback > 0 ? `${feedbackScore}%` : 'N/A'}</h3>
            {totalFeedback > 0 && <p className="text-xs text-slate-400 mt-1">Based on {totalFeedback} ratings</p>}
          </div>
          <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
            <ThumbsUp size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Main Chart Column (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Performance Trends Line Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingDown size={18} className="text-indigo-500 transform rotate-180" /> 
              Quiz Performance Trends
            </h3>
            {trendData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value}%`, 'Score']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                    />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <BookOpen size={32} className="mb-2 opacity-50" />
                <p>Complete quizzes to see performance trends.</p>
              </div>
            )}
          </div>

          {/* Content Engagement Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-fuchsia-500" /> 
              Content Engagement
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{fill: '#f1f5f9'}}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-8">
          
          {/* Plan Usage Insights */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Layers size={18} className="text-blue-500" /> 
              Plan Usage Insights
            </h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-slate-700">Daily Uploads</span>
                <span className="text-xs font-bold text-slate-500">{uploadsToday} / {uploadsLimit}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${uploadsPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${uploadsPercentage}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Resets at midnight. Upgrade for more bandwidth.</p>
            </div>

            {activePlan === 'Premium' && (
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1"><FileText size={14} className="text-amber-500"/> Document Translations</span>
                  <span className="text-xs font-bold text-slate-500">{docUploadsToday} / {docUploadsLimit}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full ${docUploadsPercentage >= 100 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${docUploadsPercentage}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Premium exclusive. Resets at midnight.</p>
              </div>
            )}

            {(activePlan === 'Pro' || activePlan === 'Premium') && (
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Bot size={14} className="text-fuchsia-500"/> Premium AI Voices</span>
                  <span className="text-xs font-bold text-slate-500">{analytics?.sarvamUsageCount || 0} / {analytics?.sarvamUsageLimit || (activePlan === 'Pro' ? 1 : 5)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full ${((analytics?.sarvamUsageCount || 0) / (analytics?.sarvamUsageLimit || (activePlan === 'Pro' ? 1 : 5))) * 100 >= 100 ? 'bg-red-500' : 'bg-fuchsia-500'}`} style={{ width: `${Math.min(((analytics?.sarvamUsageCount || 0) / (analytics?.sarvamUsageLimit || (activePlan === 'Pro' ? 1 : 5))) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Text to Speech Engine. Resets at midnight.</p>
              </div>
            )}
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-slate-700">Regeneration Limit</span>
                <span className="text-xs font-bold text-slate-500">{regenLimit} per content</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your {activePlan} plan allows you to regenerate summaries, flashcards, and quizzes up to <strong>{regenLimit}</strong> times for a single video.
                </p>
              </div>
            </div>
            
            {activePlan === 'Premium' ? (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white relative overflow-hidden shadow-lg border border-amber-400">
                <div className="relative z-10 flex flex-col h-full justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-white" />
                    <h4 className="font-bold text-sm text-white uppercase tracking-wider">Premium Member</h4>
                  </div>
                  <p className="text-xs text-amber-50 mb-1 leading-relaxed font-semibold">You're already enjoying all Premium benefits!</p>
                  <p className="text-xs text-amber-100/90 leading-relaxed">Go beyond limits with global language support, GPT-5.6-Luna, and 50 uploads/day.</p>
                </div>
                <Trophy size={80} className="absolute -right-4 -bottom-4 text-amber-300 opacity-40" />
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <h4 className="font-bold text-sm text-amber-400">Unlock Premium Limits</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">Go beyond limits with Premium. Get up to 50 uploads/day, 25 regenerations, all language support, and the ultimate GPT-5.6-Luna engine.</p>
                  <button onClick={() => setPage("PlanPricing")} className="bg-white text-slate-900 text-xs font-bold py-2 px-4 rounded-lg w-full hover:bg-slate-100 transition-colors shadow-sm">
                    View Plans
                  </button>
                </div>
                <Bot size={80} className="absolute -right-4 -bottom-4 text-slate-700 opacity-50" />
              </div>
            )}
          </div>

          {/* Language Analytics */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" /> 
              Language Analytics
            </h3>
            
            {langData.length > 0 ? (
              <div className="h-48 w-full relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={langData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {langData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">{analytics.totalUploads}</span>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Total</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-4">
                <p>No language data.</p>
              </div>
            )}
            
            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
              {langData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-700 capitalize">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

