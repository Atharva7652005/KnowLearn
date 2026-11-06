import React, { useState, useEffect } from 'react';
import { getWorkspaces, createWorkspace, joinWorkspace } from '../api';
import { Users, Copy } from 'lucide-react';

const Workspaces = ({ onSelectWorkspace }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  
  const token = localStorage.getItem("knowlearn_token");

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const data = await getWorkspaces(token);
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await createWorkspace({ name }, token);
      setShowCreate(false);
      setName('');
      fetchWorkspaces();
    } catch (err) {
      setError(err.message || 'Error creating workspace');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await joinWorkspace({ inviteCode }, token);
      setShowJoin(false);
      setInviteCode('');
      fetchWorkspaces();
    } catch (err) {
      setError(err.message || 'Error joining workspace');
    }
  };

  const copyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    alert('Invite code copied: ' + code);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 md:px-8 font-['DM_Sans',sans-serif]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Workspaces</h1>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Collaborate and share learning materials</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
          >
            Join Workspace
          </button>
          <button 
            className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all"
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
          >
            Create Workspace
          </button>
        </div>
      </header>

      {error && (
         <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
           <span className="text-sm font-medium">{error}</span>
           <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
         </div>
      )}

      {(showCreate || showJoin) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{showCreate ? 'Create Workspace' : 'Join Workspace'}</h2>
          <p className="text-gray-500 text-sm mb-6">{showCreate ? 'Give your study group a name.' : 'Enter the 4-character invite code from your group owner.'}</p>
          <form onSubmit={showCreate ? handleCreate : handleJoin} className="max-w-md">
            {showCreate ? (
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm font-semibold text-gray-700">Workspace Name</label>
                <input 
                  type="text" value={name} onChange={e => setName(e.target.value)} 
                  placeholder="e.g. CS101 Study Group" autoFocus required 
                  className="border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all w-full"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-sm font-semibold text-gray-700">4-Character Invite Code</label>
                <input 
                  type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. A1B2" maxLength={4} required autoFocus
                  className="border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all w-full uppercase"
                />
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                type="submit" 
                disabled={showCreate ? !name : inviteCode.length < 4}
                className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {showCreate ? 'Create' : 'Join'}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowCreate(false); setShowJoin(false); setError(''); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading workspaces...</p>
      ) : workspaces.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Users size={40} className="text-gray-300 mb-4" />
          <p className="text-gray-600">You haven't joined any workspaces yet.<br/>Create one or join an existing group to start collaborating.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <div 
              key={ws._id} 
              onClick={() => onSelectWorkspace(ws._id)} 
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{ws.name}</h3>
                  <p className="text-xs text-gray-500">Owner: {ws.ownerId.name}</p>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">Members: {ws.members.length} / 7</span>
                <div 
                  onClick={(e) => copyCode(e, ws.inviteCode)}
                  className="bg-purple-50 text-purple-700 border border-purple-200 border-dashed px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-purple-100 transition-colors cursor-copy"
                >
                   {ws.inviteCode} <Copy size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workspaces;
