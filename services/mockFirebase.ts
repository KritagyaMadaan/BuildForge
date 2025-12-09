
import { UserProfile, Post, UserRole, Comment, Message } from '../types';

// --- Local Storage Keys ---
const KEYS = {
  USERS: 'BF_USERS',
  POSTS: 'BF_POSTS',
  MESSAGES: 'BF_MESSAGES'
};

const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'super_admin',
    name: 'Squadran CEO',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=CEO',
    blocked: false
  },
  {
    uid: 'founder_01',
    name: 'Rohan (Founder)',
    email: 'rohan@buildforge.io',
    role: UserRole.FOUNDER,
    startupName: 'DecentraVote',
    avatar: 'https://picsum.photos/seed/student1/200',
    bio: 'Building a decentralized voting app.',
    blocked: false
  },
  {
    uid: 'lead_01',
    name: 'Platform Lead',
    role: UserRole.LEAD,
    email: 'lead@buildforge.io',
    avatar: 'https://ui-avatars.com/api/?name=Lead',
    blocked: false
  },
  {
    uid: 'dev_01',
    name: 'Vikram (Dev)',
    email: 'vikram@buildforge.io',
    role: UserRole.DEVELOPER,
    skills: 'React, Node.js',
    avatar: 'https://picsum.photos/seed/iit1/200',
    bio: 'Full Stack Developer looking for projects.',
    blocked: false
  }
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post_demo_1',
    authorId: 'dev_01',
    authorName: 'Vikram (Dev)',
    authorRole: UserRole.DEVELOPER,
    title: 'Smart Canteen App',
    content: 'We are building a queue management system for the canteen.',
    timestamp: Date.now() - 50000,
    likes: 20,
    comments: [],
    status: 'VERIFIED',
    type: 'IDEA_SUBMISSION',
    mvp: {
      description: "Mobile App (Flutter) + Node.js Backend for real-time order tracking.",
      techStack: ["Flutter", "Node.js", "Firebase"],
      docLink: "#",
      status: 'READY'
    },
    applicants: ['dev_01'],
    team: ['dev_01'] 
  }
];

// --- Helper Functions ---
const getStorage = <T>(key: string, defaultData: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Storage Error", e);
    return defaultData;
  }
};

const setStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage Write Error", e);
  }
};

// --- Service Methods ---

export const db = {
  // --- Squadran Super Admin ---
  loginSuperAdmin: (password: string): { success: boolean, user?: UserProfile } => {
    if (password === 'squadran_root') {
        const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
        let admin = users.find(u => u.role === UserRole.SUPER_ADMIN);
        if (!admin) {
            admin = INITIAL_USERS[0];
            users.push(admin);
            setStorage(KEYS.USERS, users);
        }
        return { success: true, user: admin };
    }
    return { success: false };
  },

  // --- Auth (Global) ---

  // FOUNDER REGISTRATION
  signupFounder: (data: Partial<UserProfile> & { name: string, email: string }): UserProfile => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const newUser: UserProfile = {
      uid: `founder_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: UserRole.FOUNDER,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`,
      blocked: false,
      ...data
    };
    users.push(newUser);
    setStorage(KEYS.USERS, users);
    return newUser;
  },

  // DEVELOPER REGISTRATION
  signupDeveloper: (data: Partial<UserProfile> & { name: string, email: string }): UserProfile => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const newUser: UserProfile = {
      uid: `dev_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: UserRole.DEVELOPER,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`,
      blocked: false,
      ...data
    };
    users.push(newUser);
    setStorage(KEYS.USERS, users);
    return newUser;
  },

  // LEAD LOGIN / ACCESS
  loginLead: (email: string, accessKey: string): { user: UserProfile | null, error?: string } => {
     const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
     const existingUser = users.find(u => u.email === email && u.role === UserRole.LEAD);

     // Check master key
     if (accessKey === 'admin') {
         if (existingUser) {
             return { user: existingUser };
         } else {
             // Create new Lead if doesn't exist but key is valid
             const newLead: UserProfile = {
                 uid: `lead_${Date.now()}`,
                 name: email.split('@')[0] || 'Lead',
                 email,
                 role: UserRole.LEAD,
                 avatar: `https://ui-avatars.com/api/?name=Lead`,
                 blocked: false
             };
             users.push(newLead);
             setStorage(KEYS.USERS, users);
             return { user: newLead };
         }
     }
     return { user: null, error: "Invalid Access Key" };
  },

  // Generic Login for Founder/Dev
  loginUserByEmail: (email: string): { user: UserProfile | null, error?: string } => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.email === email);
    
    if (user) {
        if (user.blocked) return { user: null, error: "Access Denied: Account Deboarded/Blocked." };
        return { user };
    }
    return { user: null, error: "User not found. Please Register." };
  },

  updateUser: (uid: string, data: Partial<UserProfile>): UserProfile | null => {
    let users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      setStorage(KEYS.USERS, users);
      return users[index];
    }
    return null;
  },

  // --- Strict Super Admin / Logic Helpers ---

  // Get all developers
  getDevelopers: (): UserProfile[] => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    return users.filter(u => u.role === UserRole.DEVELOPER && !u.blocked);
  },

  adminGetAllUsers: (): UserProfile[] => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    return users.filter(u => u.role !== UserRole.SUPER_ADMIN);
  },

  adminToggleBlockUser: (uid: string): UserProfile | undefined => {
    let users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.uid === uid);
    if (user) {
      user.blocked = !user.blocked;
      setStorage(KEYS.USERS, users);
      return user;
    }
    return undefined;
  },

  getConnectedUsers: (currentUser: UserProfile): UserProfile[] => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);

    // 0. Super Admin & Leads see everyone
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.LEAD) {
        return users.filter(u => u.uid !== currentUser.uid);
    }

    // Always include Leads/Admins for communication
    const admins = users.filter(u => (u.role === UserRole.LEAD || u.role === UserRole.SUPER_ADMIN) && !u.blocked);
    const connectedUsers = new Set<UserProfile>(admins);

    // 1. Founders see assigned Developers
    if (currentUser.role === UserRole.FOUNDER) {
        const myPosts = posts.filter(p => p.authorId === currentUser.uid);
        myPosts.forEach(post => {
            if (post.team && post.team.length > 0) {
                post.team.forEach(devId => {
                    const dev = users.find(u => u.uid === devId && !u.blocked);
                    if (dev) connectedUsers.add(dev);
                });
            }
        });
    }

    // 2. Developers see Founders of projects they are assigned to
    if (currentUser.role === UserRole.DEVELOPER) {
        const assignedPosts = posts.filter(p => p.team && p.team.includes(currentUser.uid));
        assignedPosts.forEach(post => {
            const founder = users.find(u => u.uid === post.authorId && !u.blocked);
            if (founder) connectedUsers.add(founder);
        });
    }

    return Array.from(connectedUsers).filter(u => u.uid !== currentUser.uid);
  },

  getUserById: (uid: string): UserProfile | undefined => {
    const users = getStorage<UserProfile[]>(KEYS.USERS, INITIAL_USERS);
    return users.find(u => u.uid === uid);
  },

  getPosts: (type: string, requesterRole?: UserRole, requesterId?: string): Post[] => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    
    return posts.filter(p => {
      // 1. Role Check
      if (requesterRole === UserRole.LEAD || requesterRole === UserRole.SUPER_ADMIN) {
        return p.type === type || (type === 'SPRINT_UPDATE' && p.type === 'IDEA_SUBMISSION' && p.status === 'VERIFIED');
      }

      if (requesterRole === UserRole.FOUNDER) {
          if (p.type === 'IDEA_SUBMISSION') {
              return p.authorId === requesterId; // Only own ideas
          }
          return p.type === type && p.status === 'VERIFIED';
      }

      if (requesterRole === UserRole.DEVELOPER) {
          if (p.type === 'IDEA_SUBMISSION') {
              return p.team && p.team.includes(requesterId || ''); // Only assigned
          }
          return p.type === type && p.status === 'VERIFIED';
      }

      // Default fallback
      return p.type === type && p.status === 'VERIFIED';

    }).sort((a, b) => b.timestamp - a.timestamp);
  },

  getPendingPosts: (): Post[] => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    return posts.filter(p => p.status === 'PENDING');
  },

  getUserPosts: (userId: string): Post[] => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    return posts.filter(p => p.authorId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  createPost: (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'status' | 'applicants' | 'team'>): void => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const newPost: Post = {
      ...post,
      id: `post_${Date.now()}`,
      timestamp: Date.now(),
      likes: 0,
      comments: [],
      status: 'PENDING', 
      applicants: [],
      team: []
    };
    posts.unshift(newPost);
    setStorage(KEYS.POSTS, posts);
  },

  verifyPost: (postId: string): void => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.status = 'VERIFIED'; 
        if (post.type === 'IDEA_SUBMISSION') {
            post.mvp = {
                description: `MVP Architecture for "${post.title}": Focus on core user loops. Authentication, Database Schema, and Primary Workflow.`,
                techStack: ['React Native', 'Firebase', 'Node.js'],
                docLink: '#',
                status: 'READY'
            };
        }
        setStorage(KEYS.POSTS, posts);
    }
  },

  deletePost: (postId: string): void => {
    let posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    posts = posts.filter(p => p.id !== postId);
    setStorage(KEYS.POSTS, posts);
  },

  toggleLike: (postId: string): void => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.likes += 1;
        setStorage(KEYS.POSTS, posts);
    }
  },

  applyToProject: (postId: string, userId: string): boolean => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post && post.type === 'IDEA_SUBMISSION') {
        if (!post.applicants) post.applicants = [];
        if (!post.applicants.includes(userId)) {
            post.applicants.push(userId);
            setStorage(KEYS.POSTS, posts);
            return true;
        }
    }
    return false;
  },

  assignDeveloper: (postId: string, userId: string): void => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post && post.type === 'IDEA_SUBMISSION') {
        if (!post.team) post.team = [];
        if (!post.team.includes(userId)) {
            post.team.push(userId);
            setStorage(KEYS.POSTS, posts);
        }
    }
  },

  addComment: (postId: string, userId: string, userName: string, text: string): Comment => {
    const posts = getStorage<Post[]>(KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === postId);
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId,
      userName,
      text,
      timestamp: Date.now()
    };
    if (post) {
      post.comments.push(newComment);
      setStorage(KEYS.POSTS, posts);
    }
    return newComment;
  },

  getMessages: (currentUserId: string, otherUserId: string): Message[] => {
    const messages = getStorage<Message[]>(KEYS.MESSAGES, []);
    return messages.filter(m => 
      (m.senderId === currentUserId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === currentUserId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },

  getConversations: (currentUserId: string): string[] => {
    const messages = getStorage<Message[]>(KEYS.MESSAGES, []);
    const userIds = new Set<string>();
    messages.forEach(m => {
      if (m.senderId === currentUserId) userIds.add(m.receiverId);
      if (m.receiverId === currentUserId) userIds.add(m.senderId);
    });
    return Array.from(userIds);
  },

  sendMessage: (senderId: string, receiverId: string, text: string): void => {
    const messages = getStorage<Message[]>(KEYS.MESSAGES, []);
    messages.push({
      id: `m_${Date.now()}`,
      senderId,
      receiverId,
      text,
      timestamp: Date.now(),
      read: false
    });
    setStorage(KEYS.MESSAGES, messages);
  }
};
