import React, { useState, useEffect } from 'react';
import { api, getWorkspaceContent, shareToWorkspace } from '../api';
import { Users, FileText, Play, ArrowLeft, Share2, Crown, Search, ExternalLink, Check } from 'lucide-react';
import Lesson from './Lesson';

const WorkspaceDashboard = ({ onBack, workspaceId, upload, loading: appLoading, session, onNotice, saveContent }) => {
  const [workspace, setWorkspace] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // New share flow states
  const [shareTab, setShareTab] = useState('media');
  const [myContent, setMyContent] = useState([]);
  const [loadingMyContent, setLoadingMyContent] = useState(false);
  const [selectedShareItem, setSelectedShareItem] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareSuccess, setShareSuccess] = useState(null);

  const token = localStorage.getItem("knowlearn_token");

  useEffect(() => {
    fetchContent();
  }, [workspaceId, appLoading]);

  const fetchContent = async () => {
    try {
      const data = await getWorkspaceContent(workspaceId, token);
      setWorkspace(data.workspace);
      setContent(data.content);
      
      if (selectedItem) {
         const updated = data.content.find(c => c.id === selectedItem.id || c._id === selectedItem._id);
         if (updated) setSelectedItem(updated);
      }
    } catch (err) {
      setError(err.message || 'Error loading workspace');
    } finally {
      setLoading(false);
    }
  };

  // Fetch the owner's personal content for the share dropdown
  const fetchMyContent = async () => {
    setLoadingMyContent(true);
    try {
      const result = await api('/learning/content', { token });
      setMyContent(result.content || []);
    } catch (err) {
      if (onNotice) onNotice(err.message || 'Failed to load your content');
    } finally {
      setLoadingMyContent(false);
    }
  };

  // Open Share Modal
  const openShareModal = () => {
    setShowShareModal(true);
    setShareTab('media');
    setSelectedShareItem(null);
    setSearchQuery('');
    setShareSuccess(null);
    fetchMyContent();
  };

  // Share selected item to this workspace
  const handleShareToWorkspace = async () => {
    if (!selectedShareItem) return;
    setSharing(true);
    try {
      await shareToWorkspace(selectedShareItem._id || selectedShareItem.id, workspaceId, token);
      setShareSuccess(selectedShareItem._id || selectedShareItem.id);
      setTimeout(() => {
        setShowShareModal(false);
        setSelectedShareItem(null);
        setShareSuccess(null);
        fetchContent(); // Refresh workspace content
      }, 1200);
    } catch (err) {
      if (onNotice) onNotice(err.message || 'Failed to share content');
    } finally {
      setSharing(false);
    }
  };

  const handleSummary = async () => {
    if (!isOwner) {
      if (onNotice) onNotice("Only the group owner can generate content.");
      return;
    }
    if (onNotice) onNotice("You cannot generate content from here. Please generate it from the specific Content tab.");
  };

  const handleQuiz = async (count = 5) => {
    if (!isOwner) {
      if (onNotice) onNotice("Only the group owner can generate content.");
      return;
    }
    if (onNotice) onNotice("You cannot generate content from here. Please generate it from the specific Content tab.");
  };

  // Use session.user (passed as prop from App.jsx) for reliable email-based ownership
  const currentUser = session?.user || null;
  const isOwner = currentUser && workspace && workspace.ownerId && workspace.ownerId.email === currentUser.email;
  const isPremium = currentUser && currentUser.activePlan === 'Premium';

  // Filter content for the share dropdowns
  const alreadySharedIds = content.map(c => c._id || c.id);
  
  const mediaItems = myContent
    .filter(item => item.sourceType === 'youtube_url' || item.sourceType === 'media_upload')
    .filter(item => !alreadySharedIds.includes(item._id || item.id))
    .filter(item => !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const documentItems = myContent
    .filter(item => item.sourceType === 'document')
    .filter(item => !alreadySharedIds.includes(item._id || item.id))
    .filter(item => !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading && !workspace) return <div className="p-8 text-gray-500 text-sm">Loading workspace...</div>;
  if (error) return <div className="p-8"><div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div></div>;
  if (!workspace) return <div className="p-8 text-gray-500">Workspace not found.</div>;

  // IF AN ITEM IS SELECTED, SHOW THE LESSON VIEW
  if (selectedItem) {
     return (
       <div className="w-full max-w-6xl mx-auto py-4 px-2 md:px-8">
         <button 
           className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors" 
           onClick={() => setSelectedItem(null)}
         >
           <ArrowLeft size={16} /> Back to Workspace
         </button>
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <Lesson 
              current={selectedItem} 
              loading={appLoading} 
              onSummary={handleSummary} 
              onQuiz={handleQuiz} 
              onNotice={onNotice} 
              token={token} 
              saveContent={saveContent || (() => {})} 
              activePlan={session?.user?.activePlan || "Free"} 
           />
         </div>
       </div>
     );
  }

  // MAIN WORKSPACE DASHBOARD VIEW
  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 md:px-8 font-['DM_Sans',sans-serif]">
      
      {onBack && (
        <button 
          className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors" 
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Back to Group List
        </button>
      )}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{workspace.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
              <Users size={14} /> {workspace.members.length}/7 Members
            </span>
            <span className="text-sm font-bold text-yellow-800 bg-yellow-50 border border-yellow-200 border-dashed px-2.5 py-1 rounded-md">
              Invite Code: {workspace.inviteCode}
            </span>
          </div>
        </div>
        {isOwner && (
          <button 
            className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all flex items-center gap-2"
            onClick={openShareModal}
          >
            <Share2 size={16} /> Share Data
          </button>
        )}
      </header>

      {!isOwner && (
        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg mb-8 flex items-center">
          <span className="text-sm"><strong>Note:</strong> Only the workspace owner can share content with this group.</span>
        </div>
      )}

      {/* ========== SHARE DATA MODAL ========== */}
      {showShareModal && isOwner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Share Data to Workspace</h2>
                <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={() => setShowShareModal(false)}>&#10005;</button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Select content you've already generated from your Dashboard to share with this study group.</p>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all ${shareTab === 'media' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setShareTab('media'); setSelectedShareItem(null); setSearchQuery(''); }}
                >
                  Media & YouTube
                </button>
                <button
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${shareTab === 'document' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setShareTab('document'); setSelectedShareItem(null); setSearchQuery(''); }}
                >
                  <Crown size={14} /> Documents
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              
              {/* MEDIA TAB */}
              {shareTab === 'media' && (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search your generated content..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
                    />
                  </div>

                  {loadingMyContent ? (
                    <p className="text-sm text-gray-400 text-center py-8">Loading your content...</p>
                  ) : mediaItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">
                        {searchQuery ? 'No matching content found.' : 'You haven\'t generated any media content yet.'}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">Go to your Dashboard to generate YouTube or media transcripts first, then come back here to share them.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {mediaItems.map(item => {
                        const isSelected = selectedShareItem && (selectedShareItem._id || selectedShareItem.id) === (item._id || item.id);
                        const isJustShared = shareSuccess === (item._id || item.id);
                        return (
                          <button
                            key={item._id || item.id}
                            onClick={() => setSelectedShareItem(item)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                              isJustShared 
                                ? 'border-green-400 bg-green-50'
                                : isSelected 
                                  ? 'border-purple-400 bg-purple-50 shadow-sm' 
                                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                              {item.sourceType === 'youtube_url' ? <Play size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-800 truncate">{item.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{item.sourceType === 'youtube_url' ? 'YouTube' : 'Media'}</span>
                                <span className="text-xs text-gray-300">•</span>
                                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                {item.summary && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Summary</span>}
                                {item.quiz && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Quiz</span>}
                              </div>
                            </div>
                            {isJustShared && <Check size={20} className="text-green-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* DOCUMENT TAB */}
              {shareTab === 'document' && (
                <>
                  {!isPremium ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                        <Crown size={28} className="text-amber-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Premium Feature</h3>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                        Document sharing is exclusively for Premium users. Upgrade your plan to share translated documents with your study group.
                      </p>
                      <button className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:scale-105 transition-all">
                        Upgrade to Premium
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search */}
                      <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search your translated documents..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
                        />
                      </div>

                      {loadingMyContent ? (
                        <p className="text-sm text-gray-400 text-center py-8">Loading your documents...</p>
                      ) : documentItems.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 text-sm">
                            {searchQuery ? 'No matching documents found.' : 'You haven\'t translated any documents yet.'}
                          </p>
                          <p className="text-gray-400 text-xs mt-2">Go to your Dashboard to translate a PPTX/DOCX document first, then share it here.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                          {documentItems.map(item => {
                            const isSelected = selectedShareItem && (selectedShareItem._id || selectedShareItem.id) === (item._id || item.id);
                            const isJustShared = shareSuccess === (item._id || item.id);
                            return (
                              <button
                                key={item._id || item.id}
                                onClick={() => setSelectedShareItem(item)}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                  isJustShared 
                                    ? 'border-green-400 bg-green-50'
                                    : isSelected 
                                      ? 'border-purple-400 bg-purple-50 shadow-sm' 
                                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                  <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-800 truncate">{item.title}</h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-400">Translated Document</span>
                                    <span className="text-xs text-gray-300">•</span>
                                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                {item.sourceUrl && (
                                  <a 
                                    href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.sourceUrl)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 shrink-0"
                                  >
                                    <ExternalLink size={12} /> Preview
                                  </a>
                                )}
                                {isJustShared && <Check size={20} className="text-green-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {selectedShareItem && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      {selectedShareItem.sourceType === 'youtube_url' ? <Play size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{selectedShareItem.title}</p>
                      <p className="text-xs text-gray-400">Ready to share with {workspace.members.length} member{workspace.members.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleShareToWorkspace}
                    disabled={sharing || !!shareSuccess}
                    className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ml-4 ${
                      shareSuccess 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:scale-105 hover:shadow-lg disabled:opacity-50'
                    }`}
                  >
                    {shareSuccess ? (
                      <><Check size={16} /> Shared!</>
                    ) : sharing ? (
                      'Sharing...'
                    ) : (
                      <><Share2 size={16} /> Share to Workspace</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== SHARED TRANSCRIPTS GRID ========== */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-['Playfair_Display',serif]">Shared Transcripts</h2>
      {content.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <p>This workspace is empty. {isOwner ? 'Click "Share Data" to share your generated content with this group.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map(item => (
            <div 
              key={item._id} 
              onClick={() => {
                // For documents with sourceUrl, open in Microsoft Viewer
                if (item.sourceType === 'document' && item.sourceUrl) {
                  window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.sourceUrl)}`, '_blank');
                } else {
                  setSelectedItem(item);
                }
              }} 
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors shrink-0">
                  {item.sourceType === 'youtube_url' ? <Play size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-500">
                      {item.sourceType === 'youtube_url' ? 'YouTube Video' : item.sourceType === 'document' ? 'Document' : 'Media'}
                    </p>
                    {item.sourceType === 'document' && item.sourceUrl && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <ExternalLink size={10} /> Viewer
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tags for generated AI content */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.summary && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Summary</span>}
                {item.notes && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">Notes</span>}
                {item.quiz && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Quiz</span>}
                {item.flashcards && item.flashcards.length > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Flashcards</span>}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <small className="text-xs text-gray-400 block text-right">Shared {new Date(item.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceDashboard;
