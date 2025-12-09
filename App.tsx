

import React, { useState, useEffect, useRef } from 'react';

console.log("App.tsx module loaded");
import { UserRole, Post, ViewType, UserProfile, FeatureType, Feature, Comment, Message } from './types';
import { db } from './services/firebaseAdapter';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AIChatPanel from './components/AIChatPanel';
import {
  GraduationCap, Users, Briefcase, FileText, Bell, Settings, LogOut,
  Home, Plus, Heart, MessageCircle, Share2, CheckCircle, XCircle,
  Search, Trash2, Shield, Building2, Download, Sparkles, Calendar, Edit2, Save, Send, LayoutDashboard, Mail, MessageSquare, UserPlus, Ban, Lock, Unlock, Rocket, Globe, Key, PlusCircle, Palette, ExternalLink, ArrowRight, ChevronRight, Layers, Target, ArrowLeft, Hammer, Code2, Monitor, Cpu, FileCode, Eye, MessageSquareText, Lightbulb, RefreshCcw, Upload
} from 'lucide-react';

// --- Constants ---
const SQUADRAN_LOGO_URL = "/logo-squadran.jpg";
const SUPPORT_EMAIL_PLACEHOLDER = "support@buildforge.io";

// --- Animation Component ---
const CursorBloop = () => {
  const [bloops, setBloops] = useState<{ x: number, y: number, id: number, color: string }[]>([]);

  useEffect(() => {
    let counter = 0;
    const colors = ['#FF725E', '#4AA4F2', '#6C63FF', '#43D9AD'];

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.8) return;

      const newBloop = {
        x: e.clientX,
        y: e.clientY,
        id: counter++,
        color: colors[Math.floor(Math.random() * colors.length)]
      };

      setBloops(prev => [...prev.slice(-15), newBloop]);

      setTimeout(() => {
        setBloops(prev => prev.filter(b => b.id !== newBloop.id));
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {bloops.map(bloop => (
        <div
          key={bloop.id}
          className="absolute rounded-full animate-ping"
          style={{
            left: bloop.x,
            top: bloop.y,
            width: '10px',
            height: '10px',
            backgroundColor: bloop.color,
            transform: 'translate(-50%, -50%)',
            opacity: 0.6
          }}
        />
      ))}
    </div>
  );
};

// --- User Badge Component ---
const UserBadge = ({ uid, onRemove, showRemove = false }: { uid: string, onRemove?: () => void, showRemove?: boolean }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await db.getUserById(uid);
      setUser(u || null);
    };
    fetchUser();
  }, [uid]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-brand-orange/10 text-brand-orange rounded-full text-xs font-bold border border-brand-orange/20">
      <div className="w-4 h-4 rounded-full bg-brand-orange overflow-hidden">
        {user.avatar ? (
          <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-orange text-white text-[8px]">
            {user.name.charAt(0)}
          </div>
        )}
      </div>
      <span>{user.name}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
          title="Remove from team"
        >
          ×
        </button>
      )}
    </div>
  );
};

// --- Install Prompt Popup Component ---
const InstallPromptPopup: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    setPlatform(isIOS ? 'ios' : /android/.test(userAgent) ? 'android' : 'desktop');

    // For iOS, show immediately on load (mock check)
    if (isIOS) {
      setTimeout(() => setShowPopup(true), 1000);
    }
  }, []);

  // Listen for beforeinstallprompt event (Android/Desktop)
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e);
    // Show popup immediately without checking localStorage
    setShowPopup(true);
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleDismiss = () => {
    setShowPopup(false);
    // DO NOT save to localStorage so it shows again next time
  };

  const handleInstall = async () => {
    if (platform === 'ios') {
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPopup(false);
    }
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-md shadow-2xl border-2 border-brand-orange/20">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-blue flex items-center justify-center text-3xl shrink-0">
            🚀
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900 mb-1">Install BuildForge</h3>
            <p className="text-sm text-slate-600 font-medium">
              {platform === 'ios'
                ? 'Add to your Home Screen for the best experience'
                : 'Install our app for offline access and faster loading'}
            </p>
          </div>
        </div>

        {platform === 'ios' ? (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-3">How to install on iOS:</p>
            <ol className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-blue shrink-0">1.</span>
                <span>Tap the <strong>Share</strong> button <Share2 size={12} className="inline" /> at the bottom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-blue shrink-0">2.</span>
                <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-blue shrink-0">3.</span>
                <span>Tap <strong>"Add"</strong> in the top right</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleInstall}
              className="flex-1 py-3 bg-gradient-to-r from-brand-orange to-brand-blue text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={18} /> Install Now
            </button>
          </div>
        )}

        <button
          onClick={handleDismiss}
          className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

// --- Components ---

const PostCard: React.FC<{ post: Post, currentUser: UserProfile, onUpdate: () => void, viewMode?: 'DASHBOARD' | 'MARKET' | 'SHOWCASE', developers?: UserProfile[], onRefreshDevelopers?: () => void, onSubmission?: (type: 'UPDATE' | 'FINAL_PROJECT', postId?: string) => void }> = ({ post, currentUser, onUpdate, viewMode = 'DASHBOARD', developers = [], onRefreshDevelopers, onSubmission }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAssignPanel, setShowAssignPanel] = useState(false); // For managing teams
  const [showArchitecture, setShowArchitecture] = useState(false);

  // Logic to determine if user can manage this project (ONLY Lead and Super Admin)
  const canManage = currentUser.role === UserRole.LEAD || currentUser.role === UserRole.SUPER_ADMIN;
  const isIdea = post.type === 'IDEA_SUBMISSION';
  const hasMVP = post.status === 'VERIFIED' && post.mvp;

  const handleLike = async () => {
    await db.toggleLike(post.id);
    setIsLiked(true);
    await onUpdate();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await db.addComment(post.id, currentUser.uid, currentUser.name, commentText);
    setCommentText('');
    await onUpdate();
  };

  const handleShare = () => {
    const shareText = `${post.title || 'Update'} by ${post.authorName}\n\n${post.content}\n\nShared via BuildForge`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Link copied!");
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // Status mapping for the 8-step flow
  const getStatusBadge = () => {
    if (post.status === 'REJECTED') {
      return <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-200">REJECTED BY ADMIN</span>;
    }
    if (post.status === 'PENDING') {
      return <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs font-bold rounded-full border border-yellow-200">STEP 2: SQUADRAN REVIEW</span>;
    }
    if (post.type === 'IDEA_SUBMISSION' && post.status === 'VERIFIED') {
      return <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full border border-purple-200">STEP 6: ACTIVE SPRINT</span>;
    }
    if (post.type === 'OPEN_ROLE') {
      return <span className="px-3 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-full border border-blue-200">STEP 4: DEVS APPLY</span>;
    }
    if (post.type === 'DELIVERY') {
      return <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-200">STEP 8: DELIVERY</span>;
    }
    if (post.type === 'SPRINT_UPDATE') {
      return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">STEP 7: SPRINT UPDATE</span>;
    }
    return null;
  };

  // --- MARKET MODE: Simplified View (Assignments for Devs) ---
  if (viewMode === 'MARKET') {
    return (
      <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all mb-6 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-xl text-slate-900">{post.title}</h3>
          <span className="px-3 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-full border border-blue-200">ASSIGNED TO YOU</span>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-4">{post.company || post.authorName}</p>

        {/* MVP Summary */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">MVP Concept</h4>
          <p className="text-sm text-slate-600 mb-2">{post.mvp?.description || post.content}</p>
          <div className="flex flex-wrap gap-2">
            {post.mvp?.techStack.map(tech => (
              <span key={tech} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-500">{tech}</span>
            ))}
          </div>
          {/* Architecture Document Display */}
          {post.schemaImage && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                <FileText size={12} /> Architecture Document
              </h4>
              <a
                href={post.schemaImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-brand-blue hover:underline flex items-center gap-1"
              >
                View Architecture Diagram <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        <div className="w-full py-3 bg-brand-orange/10 text-brand-orange rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-brand-orange/20">
          <CheckCircle size={16} /> You are on the Build Team
        </div>

        {/* Developer Actions */}
        {onSubmission && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Your Actions</p>
            <div className="flex gap-2">
              <button onClick={() => onSubmission('UPDATE', post.id)} className="flex-1 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs hover:opacity-90 flex items-center justify-center gap-2">
                <Plus size={14} /> Post Update
              </button>
              <button onClick={() => onSubmission('FINAL_PROJECT', post.id)} className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-xs hover:opacity-90 flex items-center justify-center gap-2">
                <Rocket size={14} /> Final Project
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SHOWCASE MODE: Delivery View ---
  if (viewMode === 'SHOWCASE') {
    return (
      <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
            <Rocket className="text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900">{post.title}</h3>
            <div className="text-xs font-bold text-slate-400">Delivered by {post.authorName}</div>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed mb-4">{post.content}</p>
        <div className="flex gap-2">
          {post.liveDemoUrl && (
            <button
              onClick={() => window.open(post.liveDemoUrl, '_blank')}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800"
            >
              View Live Demo
            </button>
          )}
          {post.githubUrl && (
            <button
              onClick={() => window.open(post.githubUrl, '_blank')}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200"
            >
              GitHub Repo
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD MODE: Full Control for Team ---
  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all mb-6 group relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center overflow-hidden shadow-sm">
            <div className="font-bold text-white">{post.authorName[0]}</div>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{post.authorName}</h3>
            <div className="text-xs text-slate-400 font-medium">
              {post.authorRole === UserRole.LEAD ? 'Platform Lead' :
                post.authorRole === UserRole.SUPER_ADMIN ? 'Super Admin' :
                  post.authorRole === UserRole.DEVELOPER ? 'Developer' : 'Founder'} • {new Date(post.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {post.type !== 'SPRINT_UPDATE' && (
        <div className="mb-3">
          <h4 className="text-xl font-black text-slate-900">{post.title}</h4>
          {post.company && <p className="text-brand-orange font-bold text-sm">{post.company}</p>}
        </div>
      )}

      <p className="text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* --- STEP 3: MVP BLUEPRINT (Visible in Dashboard) --- */}
      {isIdea && hasMVP && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <Monitor size={14} className="text-brand-orange" /> MVP Blueprint (Step 3)
            </div>
            <div className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded">READY</div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600 font-medium mb-3">{post.mvp?.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {post.mvp?.techStack.map(tech => (
                <span key={tech} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Cpu size={12} /> {tech}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowArchitecture(!showArchitecture)}
              className="w-full py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <FileCode size={14} /> {showArchitecture ? 'Hide Architecture Doc' : 'View Architecture Doc'}
            </button>

            {showArchitecture && post.mvp?.schemaImage && (
              <div className="mt-4 border-t border-slate-200 pt-3 animate-fade-in-up">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Schema / Architecture Diagram</p>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={post.mvp.schemaImage}
                    alt="Schema Diagram"
                    className="w-full h-auto object-cover max-h-60 hover:max-h-full transition-all cursor-pointer"
                    onClick={() => window.open(post.mvp?.schemaImage!!, '_blank')}
                  />
                </div>
              </div>
            )}

            {/* Developer Actions - ONLY in My Assignments (MARKET) view */}
          </div>
        </div>
      )}

      {/* --- STEP 5: ASSIGNED TEAM (Visible in Dashboard) --- */}
      {isIdea && hasMVP && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Users size={12} /> Build Team</h5>
            {canManage && (
              <button onClick={() => setShowAssignPanel(!showAssignPanel)} className="text-xs font-bold text-brand-blue hover:underline">
                {showAssignPanel ? 'Done' : 'Manage Team'}
              </button>
            )}
          </div>
          {/* Assigned Team List */}
          <div className="flex flex-wrap gap-2 mb-2">
            {(!post.team || post.team.length === 0) && <span className="text-xs text-slate-400 italic">No builders assigned yet.</span>}
            {post.team?.map(uid => (
              <UserBadge
                key={uid}
                uid={uid}
                showRemove={canManage}
                onRemove={async () => {
                  if (window.confirm('Remove this developer from the team?')) {
                    await db.unassignDeveloper(post.id, uid);
                    await onUpdate();
                  }
                }}
              />
            ))}
          </div>

          {/* Manage Team Panel - Add Developers */}
          {showAssignPanel && canManage && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h6 className="text-xs font-bold text-slate-700">Add Developers to Team</h6>
                <button
                  onClick={() => {
                    if (onRefreshDevelopers) {
                      onRefreshDevelopers();
                    } else {
                      console.log("Refresh not available");
                    }
                  }}
                  className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600 font-bold"
                >
                  Refresh List
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Total developers found: {developers.length} | Available for this post: {developers.filter(dev => !post.team?.includes(dev.uid)).length}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {developers
                  .filter(dev => !post.team?.includes(dev.uid)) // Only show developers not already on team
                  .map(dev => (
                    <label
                      key={dev.uid}
                      className="flex items-center gap-3 p-2 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors border border-slate-200"
                    >
                      <input
                        type="checkbox"
                        onChange={async (e) => {
                          if (e.target.checked) {
                            await db.assignDeveloper(post.id, dev.uid);
                            await onUpdate();
                          }
                        }}
                        className="w-4 h-4 accent-brand-blue cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-slate-800 block">{dev.name}</span>
                        <span className="text-xs text-slate-500">Skills: {dev.skills}</span>
                      </div>
                    </label>
                  ))}
                {developers.filter(dev => !post.team?.includes(dev.uid)).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {developers.length === 0
                      ? "No developers registered yet. Register developers first!"
                      : "All available developers are already on the team!"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
        <button onClick={handleLike} className={`flex items-center gap-2 transition-colors font-bold text-sm group-hover:animate-bounce ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}>
          <Heart size={18} className={post.likes > 0 || isLiked ? "fill-current" : ""} /> {post.likes}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-slate-400 hover:text-brand-blue transition-colors font-bold text-sm">
          <MessageCircle size={18} /> {post.comments.length} Comments
        </button>
        <button onClick={handleShare} className="flex items-center gap-2 text-slate-400 hover:text-brand-orange transition-colors font-bold text-sm ml-auto">
          <Share2 size={18} /> Share
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 -mx-6 px-6 pb-2">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto no-scrollbar">
            {post.comments.length === 0 && <p className="text-xs text-slate-400 italic">No feedback yet. Be the first!</p>}
            {post.comments.map(comment => (
              <div key={comment.id} className="bg-white p-3 rounded-xl text-sm shadow-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-slate-700">{comment.userName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-600">{comment.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Give feedback..."
              className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
            />
            <button onClick={handleComment} className="bg-brand-blue text-white p-2 rounded-lg hover:bg-blue-600"><Send size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- User List Item Component ---
const UserListItem = ({ uid, isActive, onClick }: { uid: string, isActive: boolean, onClick: () => void }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await db.getUserById(uid);
      setUser(u || null);
    };
    fetchUser();
  }, [uid]);

  if (!user) return null;

  return (
    <div
      onClick={onClick}
      className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-white transition-colors ${isActive ? 'bg-white border-l-4 border-brand-orange shadow-sm' : ''}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 font-bold">
            {user.name.charAt(0)}
          </div>
        )}
      </div>
      <div>
        <div className="font-bold text-slate-800 text-sm">{user.name}</div>
        <div className="text-xs text-slate-400">{user.role}</div>
      </div>
    </div>
  );
};

const NetworkingView: React.FC<{ currentUser: UserProfile, onMessage: (userId: string) => void }> = ({ currentUser, onMessage }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const connectedUsers = await db.getConnectedUsers(currentUser);
      setUsers(connectedUsers);
    };
    fetchUsers();
  }, [currentUser]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">Build Team</h1>
          <p className="text-slate-500 font-medium">Your assigned collaborators and Leads.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {users.length === 0 && (
          <div className="col-span-2 text-center p-10 bg-white rounded-[2rem] border border-slate-100">
            <Users size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">No connected users yet.</p>
            <p className="text-xs text-slate-400 mt-2">Connect by being assigned to a project team.</p>
          </div>
        )}
        {users.map(user => (
          <div key={user.uid} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${user.role === UserRole.DEVELOPER ? 'bg-purple-100 text-purple-600' : user.role === UserRole.LEAD ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{user.bio || user.email}</p>

              <div className="flex gap-2 mt-4">
                <button onClick={() => onMessage(user.uid)} className="flex-1 py-2 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2">
                  <MessageSquare size={14} /> Message
                </button>
                <a href={`mailto:${user.email || ''}`} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2">
                  <Mail size={14} /> Email
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesView: React.FC<{ currentUser: UserProfile, initialChatId?: string }> = ({ currentUser, initialChatId }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [conversations, setConversations] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialChatId) setActiveChatId(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    const loadConversations = async () => {
      const convos = await db.getConversations(currentUser.uid);
      const connectedUsers = await db.getConnectedUsers(currentUser);
      const connectedIds = new Set(connectedUsers.map(u => u.uid));

      // Filter conversations to only show currently connected users (Active Projects)
      const validConvos = convos.filter(uid => connectedIds.has(uid));
      setConversations(validConvos);
    };
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    if (activeChatId) {
      const loadMessages = async () => {
        const msgs = await db.getMessages(currentUser.uid, activeChatId);
        setMessages(msgs);
      };

      loadMessages();
      const interval = setInterval(() => {
        loadMessages();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeChatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChatId) return;
    await db.sendMessage(currentUser.uid, activeChatId, inputText);
    const msgs = await db.getMessages(currentUser.uid, activeChatId);
    setMessages(msgs);
    setInputText('');
  };

  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchActiveUser = async () => {
      if (activeChatId) {
        const user = await db.getUserById(activeChatId);
        setActiveUser(user || null);
      } else {
        setActiveUser(null);
      }
    };
    fetchActiveUser();
  }, [activeChatId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm h-[80vh] flex overflow-hidden animate-fade-in-up">
      <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg">Direct Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !activeChatId && (
            <div className="p-6 text-center text-slate-400 text-sm">No conversations yet.</div>
          )}
          {conversations.map(uid => (
            <UserListItem
              key={uid}
              uid={uid}
              isActive={activeChatId === uid}
              onClick={() => setActiveChatId(uid)}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 shadow-sm z-10">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                <img src={activeUser.avatar || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="font-bold text-slate-800">{activeUser.name}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
              {messages.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">Say hi to {activeUser.name}!</div>}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.senderId === currentUser.uid ? 'bg-brand-blue text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
              <button onClick={handleSend} className="p-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600"><Send size={20} /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <p className="font-bold">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

const UserDashboard: React.FC<{ currentUser: UserProfile, onProfileUpdate: (user: UserProfile) => void }> = ({ currentUser, onProfileUpdate }) => {
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar || '');

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await db.getUserPosts(currentUser.uid);
      setMyPosts(posts);
    };
    loadPosts();
  }, [currentUser]);

  const handleSaveProfile = async () => {
    const updated = await db.updateUser(currentUser.uid, { name: editName, bio: editBio, avatar: editAvatar });
    if (updated) {
      onProfileUpdate(updated);
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 rounded-full bg-slate-100 p-1 border-2 border-brand-orange/20 overflow-hidden">
            <img src={currentUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800">{currentUser.name}</h2>
            <p className="text-brand-orange font-bold uppercase tracking-wide text-sm">
              {currentUser.role}
            </p>
            {currentUser.bio && <p className="text-slate-500 mt-3 text-sm font-medium">{currentUser.bio}</p>}
          </div>
          <button onClick={() => setIsEditing(true)} className="py-2 px-6 bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2">
            <Edit2 size={14} /> Edit Profile
          </button>
        </div>
      </div>

      <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <LayoutDashboard size={24} className="text-brand-blue" /> My Activity
      </h3>

      <div className="grid gap-6">
        {myPosts.map(post => (
          <div key={post.id} className="relative opacity-90 hover:opacity-100 transition-opacity">
            <PostCard post={post} currentUser={currentUser} onUpdate={async () => {
              const posts = await db.getUserPosts(currentUser.uid);
              setMyPosts(posts);
            }} />
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-6">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold" placeholder="Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Profile Picture URL</label>
                <input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="w-full p-3 bg-slate-50 rounded-xl font-medium" placeholder="Bio" />
              </div>
              <button onClick={handleSaveProfile} className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="w-full py-3 text-slate-400 font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  if (!currentUser) return null;

  const [viewMode, setViewMode] = useState<'IDEAS' | 'USERS'>('IDEAS');
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [developers, setDevelopers] = useState<UserProfile[]>([]);

  // Assign Modal State
  const [assignModalPostId, setAssignModalPostId] = useState<string | null>(null);
  const [selectedDevIds, setSelectedDevIds] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const pending = await db.getPendingPosts();
      const users = await db.adminGetAllUsers();
      const devs = await db.getDevelopers();
      setPendingPosts(pending);
      setAllUsers(users);
      setDevelopers(devs);
    };
    loadData();
  }, []);

  const handleVerify = (id: string) => {
    // Open Assign Modal logic
    setAssignModalPostId(id);
    setSelectedDevIds([]);
  };

  const confirmAssignmentAndVerify = () => {
    if (!assignModalPostId) return;

    // Assign all selected developers
    if (selectedDevIds.length > 0) {
      // Use bulk assignment to prevent race conditions
      db.assignTeam(assignModalPostId, selectedDevIds);
    }

    // Verify the post
    db.verifyPost(assignModalPostId);

    // Cleanup
    setPendingPosts(prev => prev.filter(p => p.id !== assignModalPostId));
    setAssignModalPostId(null);
    alert(`Idea Approved! ${selectedDevIds.length} Developer(s) Assigned!`);
  };

  const handleReject = async (id: string) => {
    await db.rejectPost(id);
    setPendingPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleBlock = async (uid: string) => {
    // Prevent blocking yourself
    if (uid === currentUser.uid) {
      alert("You cannot deboard yourself!");
      return;
    }

    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    // HIERARCHY CHECK: Leads cannot deboard Super Admins
    if (currentUser.role === UserRole.LEAD && targetUser.role === UserRole.SUPER_ADMIN) {
      alert("Action Denied: Platform Leads cannot deboard Super Admins.");
      return;
    }

    // 1. Optimistic Update: Flip the state IMMEDIATELY
    setAllUsers(prev => prev.map(u => {
      if (u.uid === uid) {
        return { ...u, blocked: !u.blocked };
      }
      return u;
    }));

    try {
      // 2. Perform DB Operation in background
      await db.adminToggleBlockUser(uid);
    } catch (error: any) {
      console.error("Deboard failed, reverting UI:", error);
      // 3. Revert on failure
      setAllUsers(prev => prev.map(u => {
        if (u.uid === uid) {
          return { ...u, blocked: !u.blocked }; // Flip back
        }
        return u;
      }));
      alert(`Failed to update user status.\n\nError: ${error.message || error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Shield className="text-brand-orange" />
          {currentUser.role === UserRole.SUPER_ADMIN ? 'Super Admin Control' : 'Platform Lead Dashboard'}
        </h2>
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
          <button onClick={() => setViewMode('IDEAS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'IDEAS' ? 'bg-brand-dark text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Pending Ideas</button>
          <button onClick={() => setViewMode('USERS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'USERS' ? 'bg-brand-dark text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Board/Deboard Users</button>
        </div>
      </div>

      {viewMode === 'IDEAS' ? (
        <div className="grid gap-6">
          {pendingPosts.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <CheckCircle size={48} className="text-emerald-100" />
              <p>All caught up!</p>
              <p className="text-xs font-normal opacity-70">No pending ideas waiting for approval.</p>
            </div>
          )}
          {pendingPosts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center relative">
              <div>
                <h4 className="font-bold">{post.title || 'Untitled Post'}</h4>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.content}</p>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded mt-1 inline-block">Author: {post.authorName}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleVerify(post.id)} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-emerald-100">
                  <CheckCircle size={14} /> Assign & Approve
                </button>
                <button onClick={() => handleReject(post.id)} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl font-bold text-xs hover:bg-red-100">Reject</button>
              </div>

              {/* Assignment Modal Overlay */}
              {assignModalPostId === post.id && (
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 p-6 border-2 border-brand-blue">
                  <h5 className="font-bold text-slate-800 mb-2">Select Developers for Assignment</h5>
                  <p className="text-xs text-slate-500 mb-3">
                    {selectedDevIds.length} of {developers.length} developer(s) selected
                  </p>

                  {/* Select All / Clear All */}
                  <div className="flex gap-2 w-full mb-3">
                    <button
                      onClick={() => setSelectedDevIds(developers.map(d => d.uid))}
                      className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedDevIds([])}
                      className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Developer Checkbox List */}
                  <div className="w-full min-h-[200px] max-h-96 overflow-y-auto bg-slate-100 rounded-lg p-3 mb-4 border-2 border-slate-400 shadow-inner">
                    {developers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No developers available</p>
                    ) : (
                      developers.map(dev => (
                        <label
                          key={dev.uid}
                          className="flex items-center gap-3 p-3 mb-2 bg-slate-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-slate-200 hover:border-brand-blue"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDevIds.includes(dev.uid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDevIds([...selectedDevIds, dev.uid]);
                              } else {
                                setSelectedDevIds(selectedDevIds.filter(id => id !== dev.uid));
                              }
                            }}
                            className="w-5 h-5 accent-brand-blue cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-bold text-slate-800 block">{dev.name}</span>
                            <span className="text-xs text-slate-500">Skills: {dev.skills}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 w-full">
                    <button onClick={confirmAssignmentAndVerify} className="flex-1 py-2 bg-brand-blue text-white rounded-lg font-bold text-xs">Confirm & Verify</button>
                    <button onClick={() => setAssignModalPostId(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr><th className="p-4 text-xs font-black text-slate-400 uppercase">User</th><th className="p-4 text-right">Boarding Status</th></tr>
            </thead>
            <tbody>
              {allUsers.map(user => (
                <tr key={user.uid} className="border-b border-slate-50">
                  <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                    <img src={user.avatar} className="w-8 h-8 rounded-full" /> {user.name} <span className="text-slate-400 font-normal">({user.role})</span>
                  </td>
                  <td className="p-4 text-right flex gap-2 justify-end">
                    <button onClick={() => handleToggleBlock(user.uid)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${user.blocked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                      {user.blocked ? 'DEBOARDED (BANNED)' : 'BOARDED (ACTIVE)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  // Session Persistence Removed by User Request
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [developers, setDevelopers] = useState<UserProfile[]>([]);

  // Load developers list
  const loadDevelopers = async () => {
    const devs = await db.getDevelopers();
    console.log("DEBUG: Loaded Developers:", devs);
    setDevelopers(devs);
  };

  // Debug: Expose db to window
  useEffect(() => {
    (window as any).db = db;

    // FORCE LOGOUT ON RELOAD (User Request)
    // This overrides Firebase's default persistence
    signOut(auth).then(() => {
      console.log("Session cleared on reload (Strict Mode)");
      setCurrentUser(null);
      setIsSuperAdminMode(false);
    });

    // Persist Login State Sync with Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If we have a firebase user, always prefer that (truth from server)
        console.log("Auth State Verified:", user.email);
        const userProfile = await db.getUserById(user.uid);
        if (userProfile) {
          // Only update if different to avoid loops/renders, or just strict update
          setCurrentUser(prev => (prev?.uid !== userProfile.uid ? userProfile : prev));
          if (userProfile.role === UserRole.SUPER_ADMIN) setIsSuperAdminMode(true);
        }
      }
      // If no firebase user, we DO NOT clear current user immediately
      // because they might be a "Mock User" from the recovery fallback.
      // Logout is now explicit.
    });

    loadDevelopers();

    return () => unsubscribe();
  }, []);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.SPRINT_HUB);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [directMessageTarget, setDirectMessageTarget] = useState<string | null>(null);
  const [showRootInput, setShowRootInput] = useState(false);
  const [submissionType, setSubmissionType] = useState<'UPDATE' | 'FINAL_PROJECT'>('UPDATE');
  const [submissionTargetPostId, setSubmissionTargetPostId] = useState<string | null>(null);

  // New Registration State
  const [registrationRole, setRegistrationRole] = useState<'FOUNDER' | 'DEVELOPER' | 'LEAD' | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    startupName: '', stage: '', description: '', techHelp: '', budget: '', timeline: '',
    college: '', skills: '', github: '', availability: '', experience: '',
    password: '', accessKey: ''
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  // Update formData helper
  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // UPDATED REFRESH POSTS WITH STRICT FILTERING ARGS
  const refreshPosts = async () => {
    // Determine context for data fetching
    const role = currentUser?.role;
    const uid = currentUser?.uid;

    if (currentView === ViewType.SPRINT_HUB) {
      // Fetch both sprint updates AND idea submissions for the Sprint Hub
      const sprintPosts = await db.getPosts('SPRINT_UPDATE');
      const ideaPosts = await db.getPosts('IDEA_SUBMISSION');
      // Combine and sort by timestamp (newest first)
      let allPosts = [...sprintPosts, ...ideaPosts].sort((a, b) => b.timestamp - a.timestamp);

      // RESTRICT FOUNDER VIEW: Only show their own posts
      if (role === UserRole.FOUNDER && uid) {
        allPosts = allPosts.filter(p => p.authorId === uid);
      }

      setPosts(allPosts);
    }
    else if (currentView === ViewType.DEV_MARKET) {
      // Dev Market now acts as "My Assignments" for devs
      // Show IDEA_SUBMISSION posts where the developer is in the team
      const allIdeas = await db.getPosts('IDEA_SUBMISSION');
      console.log('DEV_MARKET: All ideas fetched:', allIdeas.length);
      console.log('DEV_MARKET: Current user UID:', uid, 'Type:', typeof uid);

      const assignedPosts = allIdeas.filter(post => {
        // Safe check for team array
        const team = post.team || [];

        // Detailed log for each post
        console.log(`Checking Post "${post.title}" (ID: ${post.id})`);
        // console.log(`- Team JSON:`, JSON.stringify(team));

        // Robust check: Handle string/number, whitespace, possible object wrapping
        const isAssigned = team.some(member => {
          // Handle if member is object (legacy data safety)
          const memberId = (typeof member === 'object' && member !== null) ? (member as any).uid || (member as any).id : member;

          // Compare as strings, trimmed
          const match = String(memberId).trim() === String(uid).trim();
          // if (match) console.log(`  -> Match found! Member: ${JSON.stringify(member)} matches UID: ${uid}`);
          return match;
        });

        return isAssigned;
      });
      console.log('DEV_MARKET: Final Assigned posts count:', assignedPosts.length);
      setPosts(assignedPosts);
    }
    else if (currentView === ViewType.LAUNCHPAD) {
      const posts = await db.getPosts('DELIVERY');
      setPosts(posts);
    }
  };

  useEffect(() => {
    refreshPosts();
  }, [currentView, currentUser]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      alert(`Message sent to ${SUPPORT_EMAIL_PLACEHOLDER}. We will contact you shortly.`);
      setContactForm({ name: '', email: '', message: '' });
    } else {
      alert("Please fill all fields");
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await db.loginSuperAdmin(formData.password.trim());
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsSuperAdminMode(true);
    } else {
      alert("Access Denied: Invalid Root Password");
    }
  };

  // Handle Registration / Login Submissions
  const handleSubmitAuth = async () => {
    if (registrationRole === 'FOUNDER') {
      if (!formData.name || !formData.email || !formData.startupName) return alert("Required: Name, Email, Startup Name");
      const user = await db.signupFounder({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        startupName: formData.startupName,
        startupStage: formData.stage,
        startupDescription: formData.description,
        techHelpNeeded: formData.techHelp,
        budget: formData.budget,
        timeline: formData.timeline
      } as any);
      if (user) {
        setCurrentUser(user);
        setCurrentView(ViewType.SPRINT_HUB);
        alert("Founder Dashboard Access Granted!");
      } else {
        alert("Registration Failed!\n\nPossible reasons:\n- Email already in use\n- Password too weak (min 6 chars)\n- Network issue");
      }
    }
    else if (registrationRole === 'DEVELOPER') {
      if (!formData.name || !formData.email || !formData.skills) return alert("Required: Name, Email, Skills");
      const user = await db.signupDeveloper({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        college: formData.college,
        skills: formData.skills,
        githubUrl: formData.github,
        timeAvailability: formData.availability,
        experience: formData.experience
      } as any);
      if (user) {
        setCurrentUser(user);
        setCurrentView(ViewType.DEV_MARKET); // Developers land on market
        alert("Developer Dashboard Access Granted!");
      } else {
        alert("Registration Failed!\n\nPossible reasons:\n- Email already in use\n- Password too weak (min 6 chars)\n- Network issue");
      }
    }
    else if (registrationRole === 'LEAD') {
      const result = await db.loginLead(formData.email, formData.accessKey);
      if (result.user) {
        setCurrentUser(result.user);
        setCurrentView(ViewType.ADMIN_DASHBOARD);
        alert("Lead Dashboard Access Granted!");
      } else {
        alert(result.error || "Login Failed");
      }
    }
  };

  const handleLoginExisting = async () => {
    const result = await db.loginUserByEmail(formData.email, formData.password);
    if (result.user) {
      setCurrentUser(result.user);
      // Redirect based on role
      if (result.user.role === UserRole.LEAD || result.user.role === UserRole.SUPER_ADMIN) {
        setCurrentView(ViewType.ADMIN_DASHBOARD);
      } else if (result.user.role === UserRole.DEVELOPER) {
        setCurrentView(ViewType.DEV_MARKET); // Acts as "My Assignments"
      } else {
        setCurrentView(ViewType.SPRINT_HUB);
      }
    } else {
      alert(result.error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const form = e.target as HTMLFormElement;
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;

    console.log("DEBUG: handleCreatePost called");
    console.log("DEBUG: submissionType:", submissionType);
    console.log("DEBUG: submissionTargetPostId:", submissionTargetPostId);
    console.log("DEBUG: currentView:", currentView);

    let type: any = 'SPRINT_UPDATE';

    // Explicitly handle Final Project first (overrides view defaults)
    if (submissionType === 'FINAL_PROJECT') {
      type = 'DELIVERY';
    } else if (currentView === ViewType.DEV_MARKET) {
      type = 'OPEN_ROLE';
    } else if (currentView === ViewType.LAUNCHPAD) {
      type = 'DELIVERY';
    } else if (currentView === ViewType.SPRINT_HUB && (form.elements.namedItem('isIdea') as HTMLInputElement)?.checked) {
      type = 'IDEA_SUBMISSION';
    }

    let jobData: any = {};
    if (type === 'OPEN_ROLE') {
      const titleInput = form.elements.namedItem('title') as HTMLInputElement;
      const companyInput = form.elements.namedItem('company') as HTMLInputElement;
      const linkInput = form.elements.namedItem('link') as HTMLInputElement;

      jobData = {
        title: titleInput ? titleInput.value : '',
        company: companyInput ? companyInput.value : currentUser.startupName || '',
        jobLink: linkInput ? linkInput.value : ''
      };
    } else if (type === 'DELIVERY') {
      const githubUrl = (form.elements.namedItem('githubUrl') as HTMLInputElement)?.value;
      const liveDemoUrl = (form.elements.namedItem('liveDemoUrl') as HTMLInputElement)?.value;
      const titleInput = form.elements.namedItem('title') as HTMLInputElement;

      jobData = {
        title: titleInput ? titleInput.value : '', // Might be empty for updates
        githubUrl: githubUrl,
        liveDemoUrl: liveDemoUrl
      };
    } else {
      const titleInput = form.elements.namedItem('title') as HTMLInputElement;
      jobData = {
        title: titleInput ? titleInput.value : '',
      };
    }

    // For IDEA_SUBMISSION, capture the tech stack
    if (type === 'IDEA_SUBMISSION') {
      const techStackInput = (form.elements.namedItem('techStack') as HTMLInputElement)?.value;
      if (techStackInput && techStackInput.trim()) {
        // Split by comma and trim whitespace
        jobData.techStack = techStackInput.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0);
      }

      const schemaImage = (form.elements.namedItem('schemaImage') as HTMLInputElement)?.value;
      if (schemaImage && schemaImage.trim()) {
        jobData.schemaImage = schemaImage.trim();
      }
    }

    // Wait for the post to be created before continuing
    const postData = {
      authorId: currentUser.uid,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content,
      type,
      ...jobData
    };

    try {
      if (submissionType === 'FINAL_PROJECT' && submissionTargetPostId) {
        console.log("DEBUG: Branch - UPDATING Existing Post", submissionTargetPostId);
        // UPDATE EXISTING POST for Final Project
        const githubUrl = (form.elements.namedItem('githubUrl') as HTMLInputElement)?.value;
        const liveDemoUrl = (form.elements.namedItem('liveDemoUrl') as HTMLInputElement)?.value;

        await db.updatePost(submissionTargetPostId, {
          type: 'DELIVERY',
          githubUrl: githubUrl,
          liveDemoUrl: liveDemoUrl,
          content: postData.content, // Using the update content
          status: 'VERIFIED' // Ensure it stays verified/visible
        });

        setSubmissionTargetPostId(null); // Reset target
      } else {
        console.log("DEBUG: Branch - CREATING New Post");
        // CREATE NEW POST (default behavior)
        await db.createPost(postData);
      }

      setShowCreateModal(false);
      await refreshPosts(); // Also await the refresh
    } catch (error) {
      console.error("Error creating/updating post - DETAILS:", error);
      if (error instanceof Error) {
        console.error("Stack:", error.stack);
      }
      alert(`Failed to create/update post. Error: ${error}`);
    }

    if (type === 'IDEA_SUBMISSION') {
      alert("Idea Submitted to Super Admin for Approval.");
    } else if (submissionType === 'FINAL_PROJECT' && submissionTargetPostId) {
      alert("Final Project Submitted!");
    } else {
      alert("Update posted!");
    }
  };

  const handleBackToHome = () => {
    if (currentUser) {
      if (window.confirm("Return to Home Page? You will be logged out.")) {
        setCurrentUser(null);
        setRegistrationRole(null);
        setIsSuperAdminMode(false);
      }
    } else {
      setRegistrationRole(null);
    }
  };

  // --- MAIN DASHBOARD (Post Login) ---
  if (currentUser) {


    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {currentUser.blocked && (
          <div className="fixed inset-0 z-50 bg-red-900 flex flex-col items-center justify-center p-8 text-center text-white">
            <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl max-w-md w-full animate-fade-in-up">
              <Shield className="w-20 h-20 text-red-400 mx-auto mb-6" />
              <h1 className="text-3xl font-black mb-2">Access Suspended</h1>
              <p className="text-white/80 font-bold mb-8">
                Your account has been deboarded (blocked) by an administrator. You can no longer access the platform.
              </p>
              <button
                onClick={() => setCurrentUser(null)}
                className="w-full py-4 bg-white text-red-900 rounded-xl font-black hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={20} /> Sign Out
              </button>
            </div>
          </div>
        )}
        <CursorBloop />
        <InstallPromptPopup />
        {/* SIDEBAR */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col h-screen sticky top-0 z-20">
          <div className="p-8">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <img src={SQUADRAN_LOGO_URL} className="w-8 h-8 object-contain" /> BuildForge
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1 pl-11">Global Platform</p>
          </div>
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
            {currentUser.role !== UserRole.DEVELOPER && (
              <button onClick={() => setCurrentView(ViewType.SPRINT_HUB)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.SPRINT_HUB ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Sprint Hub</button>
            )}

            {/* For Developers, Market = Assignments */}
            {currentUser.role === UserRole.DEVELOPER && (
              <button onClick={() => setCurrentView(ViewType.DEV_MARKET)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.DEV_MARKET ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Code2 size={20} /> My Assignments</button>
            )}

            <button onClick={() => setCurrentView(ViewType.LAUNCHPAD)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.LAUNCHPAD ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Rocket size={20} /> Launchpad</button>

            {/* Connect Section - Visible to ALL users now */}
            <div className="pt-4 pb-2 pl-4 text-xs font-bold text-slate-400 uppercase">Connect</div>
            <button onClick={() => setCurrentView(ViewType.NETWORKING)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.NETWORKING ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={20} /> Team</button>
            <button onClick={() => setCurrentView(ViewType.MESSAGES)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.MESSAGES ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><MessageSquare size={20} /> Messages</button>

            <div className="pt-4 pb-2 pl-4 text-xs font-bold text-slate-400 uppercase">Account</div>
            <button onClick={() => setCurrentView((currentUser.role === UserRole.LEAD || currentUser.role === UserRole.SUPER_ADMIN) ? ViewType.ADMIN_DASHBOARD : ViewType.USER_DASHBOARD)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.ADMIN_DASHBOARD || currentView === ViewType.USER_DASHBOARD ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={20} /> Dashboard</button>

            {/* Removed Back to Home Button */}
          </nav>
          <div className="p-6 border-t border-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden"><img src={currentUser.avatar} className="w-full h-full object-cover" /></div>
              <div><div className="text-sm font-bold text-slate-800">{currentUser.name}</div><div className="text-xs text-slate-400 font-bold">{currentUser.role}</div></div>
            </div>
            <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-sm"><LogOut size={16} /> Logout</button>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10">
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-6">
            <div className="font-black text-xl text-slate-800 flex items-center gap-2">
              <img src={SQUADRAN_LOGO_URL} className="w-6 h-6 object-contain" /> BuildForge
            </div>
            <button onClick={() => setCurrentUser(null)}><LogOut size={20} className="text-slate-400" /></button>
          </div>

          {currentView === ViewType.ADMIN_DASHBOARD ? (
            <AdminDashboard currentUser={currentUser} />
          ) : currentView === ViewType.USER_DASHBOARD ? (
            <UserDashboard currentUser={currentUser} onProfileUpdate={setCurrentUser} />
          ) : currentView === ViewType.NETWORKING ? (
            <NetworkingView
              currentUser={currentUser}
              onMessage={(uid) => {
                setDirectMessageTarget(uid);
                setCurrentView(ViewType.MESSAGES);
              }}
            />
          ) : currentView === ViewType.MESSAGES ? (
            <MessagesView currentUser={currentUser} initialChatId={directMessageTarget || undefined} />
          ) : (
            <div className="max-w-3xl mx-auto">
              <header className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 mb-1">
                    Squadran BuildForge
                  </h1>
                  <p className="text-slate-400 font-bold text-sm">
                    {currentView === ViewType.SPRINT_HUB ? 'Project Dashboard (Step 6)' : currentView === ViewType.DEV_MARKET ? 'My Assignments' : 'Project Delivery (Step 8)'}
                  </p>
                </div>
                {(currentView === ViewType.SPRINT_HUB || currentView === ViewType.LAUNCHPAD) && (
                  <>
                    {currentView === ViewType.SPRINT_HUB && currentUser.role === UserRole.FOUNDER && (
                      <button onClick={() => { setSubmissionType('UPDATE'); setShowCreateModal(true); }} className="text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-transform hover:scale-105 shadow-lg bg-brand-blue">
                        <Plus size={20} />
                        Submit Idea (Step 1)
                      </button>
                    )}
                  </>
                )}
              </header>

              <div className="animate-fade-in-up">
                {posts.length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                    <Search size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="font-bold text-slate-400">
                      {currentView === ViewType.DEV_MARKET ? "No projects assigned yet." : "No content yet."}
                    </p>
                  </div>
                ) : (
                  posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onUpdate={refreshPosts}
                      viewMode={currentView === ViewType.DEV_MARKET ? 'MARKET' : currentView === ViewType.LAUNCHPAD ? 'SHOWCASE' : 'DASHBOARD'}
                      developers={developers}
                      onRefreshDevelopers={loadDevelopers}
                      onSubmission={(type, postId) => {
                        console.log("DEBUG: onSubmission wrapper called", type, postId);
                        setSubmissionType(type);
                        if (postId) setSubmissionTargetPostId(postId);
                        setShowCreateModal(true);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-around z-30">
          {currentUser.role !== UserRole.DEVELOPER && <button onClick={() => setCurrentView(ViewType.SPRINT_HUB)} className="p-2 rounded-xl text-slate-400"><LayoutDashboard size={24} /></button>}
          {currentUser.role === UserRole.DEVELOPER && <button onClick={() => setCurrentView(ViewType.DEV_MARKET)} className="p-2 rounded-xl text-slate-400"><Code2 size={24} /></button>}
          <button onClick={() => setCurrentView(ViewType.LAUNCHPAD)} className="p-2 rounded-xl text-slate-400"><Rocket size={24} /></button>
          <button onClick={() => setCurrentView(ViewType.MESSAGES)} className="p-2 rounded-xl text-slate-400"><MessageSquare size={24} /></button>
          <button onClick={() => setCurrentView((currentUser.role === UserRole.LEAD || currentUser.role === UserRole.SUPER_ADMIN) ? ViewType.ADMIN_DASHBOARD : ViewType.USER_DASHBOARD)} className="p-2 rounded-xl text-slate-400"><Settings size={24} /></button>
        </div>

        {/* AI Assistant FAB */}
        <button onClick={() => setActiveFeature({ id: FeatureType.CONTENT_ASSISTANT, title: 'AI Helper', subtitle: '', description: '', icon: '', color: '', bgColor: '' })} className="fixed bottom-20 md:bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-40 bg-brand-orange"><Sparkles size={24} /></button>

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800">
                {currentView === ViewType.SPRINT_HUB ? 'Submit Idea (Step 1)' :
                  submissionType === 'FINAL_PROJECT' ? 'Submit Final Project' : 'Create Post'}
              </h3><button onClick={() => setShowCreateModal(false)}><XCircle className="text-slate-400 hover:text-red-500" /></button></div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                {(currentView === ViewType.SPRINT_HUB || currentView === ViewType.LAUNCHPAD || currentView === ViewType.DEV_MARKET) && (
                  <div className="space-y-4">
                    {submissionType !== 'FINAL_PROJECT' && (
                      <input name="title" required placeholder="Title" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" />
                    )}

                    {submissionType === 'FINAL_PROJECT' && (
                      <>
                        <input name="githubUrl" required placeholder="GitHub Repository URL" className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none" />
                        <input name="liveDemoUrl" required placeholder="Live Demo URL" className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none" />
                      </>
                    )}
                  </div>
                )}

                <textarea name="content" required rows={5} placeholder={currentView === ViewType.SPRINT_HUB ? "Describe your idea... (This will be sent for Step 2 Review)" : "Update Content..."} className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none resize-none"></textarea>

                {currentView === ViewType.SPRINT_HUB && (
                  <>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isIdea" name="isIdea" defaultChecked className="w-4 h-4 accent-brand-orange" />
                      <label htmlFor="isIdea" className="text-sm font-bold text-slate-500">Submit as New Product Idea</label>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="techStack" className="text-sm font-bold text-slate-700 block">Tech Stack for MVP</label>
                      <input
                        type="text"
                        id="techStack"
                        name="techStack"
                        placeholder="e.g., React, Node.js, PostgreSQL, Firebase"
                        className="w-full p-3 bg-slate-50 rounded-xl font-medium outline-none border-2 border-transparent focus:border-brand-blue/30 focus:bg-white transition-all text-sm"
                      />
                      <p className="text-xs text-slate-400 font-medium">Enter technologies separated by commas</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="schemaImage" className="text-sm font-bold text-slate-700 block">Schema Diagram URL (Optional)</label>
                      <input
                        type="text"
                        id="schemaImage"
                        name="schemaImage"
                        placeholder="https://imgur.com/..."
                        className="w-full p-3 bg-slate-50 rounded-xl font-medium outline-none border-2 border-transparent focus:border-brand-blue/30 focus:bg-white transition-all text-sm"
                      />
                      <p className="text-xs text-slate-400 font-medium">Link to your database schema or architecture diagram</p>
                    </div>
                  </>
                )}

                <button type="submit" className="w-full py-3 text-white rounded-xl font-bold hover:opacity-90 bg-brand-blue">
                  {currentView === ViewType.SPRINT_HUB ? 'Submit for Review' : 'Post'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LANDING PAGE / REGISTRATION (Unified) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-x-hidden overflow-y-auto selection:bg-brand-orange selection:text-white">
      <CursorBloop />
      <InstallPromptPopup />
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col p-6 md:p-12 gap-16">
        <div className="grid md:grid-cols-2 gap-12 items-center min-h-[80vh]">
          <div className="text-left space-y-8 md:pr-12 animate-fade-in-up">
            <div>
              <img src={SQUADRAN_LOGO_URL} alt="Squadran" className="h-20 w-auto mb-6 object-contain" />
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight mb-4">
                Squadran <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-blue">BuildForge</span>
              </h1>
              <p className="text-2xl font-bold text-slate-600">
                Where student ideas are forged into products.
              </p>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">BuildForge Access</h2>
                <p className="text-slate-400 font-bold text-sm">Join the ecosystem or login below</p>
              </div>

              {/* REGISTRATION & LOGIN FORM CONTAINER */}
              {!registrationRole ? (
                <div className="space-y-4">
                  {/* LOGIN FORM - DEFAULT VIEW */}
                  <div className="space-y-3 mb-6">
                    <input value={formData.email} onChange={e => updateForm('email', e.target.value)} placeholder="Email" type="email" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 focus:bg-white transition-all" />

                    <input value={formData.password} onChange={e => updateForm('password', e.target.value)} placeholder="Password" type="password" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 focus:bg-white transition-all" />

                    <button onClick={handleLoginExisting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl flex items-center justify-center gap-2 group transition-all">
                      Login <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center gap-4 my-2">
                      <div className="flex-1 border-t border-slate-200"></div>
                      <span className="text-xs font-bold text-slate-400">OR</span>
                      <div className="flex-1 border-t border-slate-200"></div>
                    </div>

                    <button
                      onClick={async () => {
                        const result = await db.loginWithGoogle();
                        if (result.user) {
                          setCurrentUser(result.user);
                          if (result.user.role === UserRole.LEAD || result.user.role === UserRole.SUPER_ADMIN) {
                            setCurrentView(ViewType.ADMIN_DASHBOARD);
                          } else if (result.user.role === UserRole.DEVELOPER) {
                            setCurrentView(ViewType.DEV_MARKET);
                          } else {
                            setCurrentView(ViewType.SPRINT_HUB);
                          }
                        } else {
                          alert("Google Login Failed: " + result.error);
                        }
                      }}
                      className="w-full py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 flex items-center justify-center gap-2 group transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z.01-.01.01z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign in with Google
                    </button>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-300 uppercase">Or Register As</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  <button onClick={() => setRegistrationRole('FOUNDER')} className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-blue hover:bg-blue-50/50 transition-all flex items-center gap-3 text-left group">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center"><Rocket size={20} /></div>
                    <div>
                      <h3 className="font-black text-slate-800">Founder</h3>
                      <p className="text-slate-400 text-xs font-bold">I have a startup idea</p>
                    </div>
                  </button>

                  <button onClick={() => setRegistrationRole('DEVELOPER')} className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-orange hover:bg-orange-50/50 transition-all flex items-center gap-3 text-left group">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center"><Code2 size={20} /></div>
                    <div>
                      <h3 className="font-black text-slate-800">Developer</h3>
                      <p className="text-slate-400 text-xs font-bold">I want to build projects</p>
                    </div>
                  </button>

                  <button onClick={() => setRegistrationRole('LEAD')} className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-800 hover:bg-slate-50 transition-all flex items-center gap-3 text-left group">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center"><Shield size={20} /></div>
                    <div>
                      <h3 className="font-black text-slate-800">Platform Lead</h3>
                      <p className="text-slate-400 text-xs font-bold">Manage projects</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  <button onClick={() => setRegistrationRole(null)} className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600"><ArrowLeft size={14} /> Back</button>

                  {registrationRole === 'FOUNDER' && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-slate-800 mb-2">Founder Application</h3>
                      <input placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('name', e.target.value)} />
                      <input placeholder="Email" type="email" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('email', e.target.value)} />
                      <input placeholder="Password (min 6 characters)" type="password" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('password', e.target.value)} />
                      <input placeholder="Startup Name" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('startupName', e.target.value)} />
                      <textarea placeholder="Idea Description..." rows={2} className="w-full p-3 bg-slate-50 rounded-xl font-medium outline-none resize-none text-sm" onChange={e => updateForm('description', e.target.value)}></textarea>
                      <button onClick={handleSubmitAuth} className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 mt-2">Submit</button>
                    </div>
                  )}
                  {registrationRole === 'DEVELOPER' && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-slate-800 mb-2">Developer Profile</h3>
                      <input placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('name', e.target.value)} />
                      <input placeholder="Email" type="email" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('email', e.target.value)} />
                      <input placeholder="Password (min 6 characters)" type="password" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('password', e.target.value)} />
                      <input placeholder="Key Skills (React, Python...)" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('skills', e.target.value)} />
                      <button onClick={handleSubmitAuth} className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold shadow-lg hover:bg-orange-600 mt-2">Submit</button>
                    </div>
                  )}
                  {registrationRole === 'LEAD' && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-slate-800 mb-2">Lead Authenticate</h3>
                      <input placeholder="Email" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('email', e.target.value)} />
                      <input type="password" placeholder="Access Key" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-sm" onChange={e => updateForm('accessKey', e.target.value)} />
                      <button onClick={handleSubmitAuth} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 mt-2">Authenticate</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-center mt-4 text-xs text-slate-300 font-mono">v3.2 - Deboard Update</div>

            <div className="text-center mt-8">
              {/* Root Login Trigger */}
              {/* Root Login Trigger */}
              {!showRootInput ? (
                <button onClick={() => setShowRootInput(true)} className="text-xs font-bold text-slate-300 hover:text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                  <Lock size={12} /> Root Access
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 animate-fade-in-up">
                  <input
                    type="password"
                    placeholder="Root Key..."
                    className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-brand-blue"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const pwd = (e.target as HTMLInputElement).value;
                        const res = await db.loginSuperAdmin(pwd);
                        if (res.success && res.user) {
                          setCurrentUser(res.user);
                          setIsSuperAdminMode(true);
                          setCurrentView(ViewType.ADMIN_DASHBOARD);
                          setShowRootInput(false);
                          alert("Super Admin Access Granted!");
                        } else {
                          console.error("Root Login Failed:", res);
                          alert(`LOGIN FAILED\n\nError: ${res.error}\n\nPlease report this exact message.`);
                        }
                      }
                    }}
                  />
                  <button onClick={() => setShowRootInput(false)} className="text-slate-400 hover:text-red-500"><XCircle size={16} /></button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INFO SECTION */}
        <div className="py-16 animate-fade-in-up border-t border-slate-200/50">
          <h2 className="text-3xl md:text-4xl font-black text-center text-slate-900 mb-16">BuildForge: A Simultaneous Startup & Career Engine</h2>

          <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col items-center text-center relative hover:shadow-md transition-shadow">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-6">
                <Lightbulb size={40} className="fill-current" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6">For Founders</h3>
              <ul className="space-y-4 text-left w-full text-slate-600 font-medium">
                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>Affordable MVP development</li>
                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>Complete UI/UX + Frontend + Backend</li>
              </ul>
            </div>

            <div className="flex justify-center md:py-0 py-8">
              <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center text-green-500 animate-spin-slow">
                <RefreshCcw size={48} />
              </div>
            </div>

            <div className="bg-[#F8FEE7] p-8 rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col items-center text-center relative hover:shadow-md transition-shadow">
              <div className="w-20 h-20 rounded-full bg-purple-900 flex items-center justify-center text-white mb-6">
                <GraduationCap size={40} className="fill-current" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6">For Students</h3>
              <ul className="space-y-4 text-left w-full text-slate-700 font-medium">
                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0"></span>Real-world project experience</li>
                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0"></span>Earn stipends while learning</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CONTACT SUPPORT SECTION */}
        <div className="py-16 max-w-2xl mx-auto w-full animate-fade-in-up border-t border-slate-200/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Contact Support</h2>
            <p className="text-slate-500 font-bold">Questions? Issues? We're here to help.</p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-2 block uppercase">Name</label>
                <input required value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Your Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-2 block uppercase">Email</label>
                <input required type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="your@email.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-2 block uppercase">Message</label>
                <textarea required rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none resize-none focus:ring-2 focus:ring-brand-blue/20" placeholder="How can we help?"></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2">
                <Send size={18} /> Send Message
              </button>
              <p className="text-center text-xs text-slate-400 mt-4">
                Emails are sent to <span className="font-bold text-slate-500">{SUPPORT_EMAIL_PLACEHOLDER}</span>
              </p>
            </form>
          </div>
        </div>

      </div>
    </div >
  );
};

export default App;
