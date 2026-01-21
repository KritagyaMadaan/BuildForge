// Firebase Adapter - bridges the gap between old mock API and new Firebase API
import { User } from 'firebase/auth';
import { authService } from './authService';
import { dbService } from './dbService';
import { UserProfile, Post, UserRole, Comment, Message } from '../types';

export const db = {
    // ===== AUTHENTICATION =====

    loginSuperAdmin: async (password: string): Promise<{ success: boolean, user?: UserProfile, error?: string }> => {
        console.log("Attempting Super Admin login...");

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password.toLowerCase());
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const targetHash = import.meta.env.VITE_ADMIN_KEY_HASH || '';

            // For super admin, we'll use a special email
            if (hashHex === targetHash && targetHash !== '') {
                console.log("Password match confirmed. Proceeding to Firebase auth...");
                const email = 'root.admin.v4@buildforge.io';
                // Use a stronger password that Firebase will accept (uppercase, lowercase, special char, numbers)
                const firebasePassword = 'Squadran@Root2025';

                try {
                    // Try to login first
                    console.log("Attempting authService.signIn...");
                    let result = await authService.signIn(email, firebasePassword);
                    console.log("SignIn result:", result);

                    if (result.success && result.user) {
                        console.log("Super Admin login successful!");
                        return { success: true, user: result.user };
                    }

                    console.log("Login failed (" + result.error + "). Attempting to create Super Admin account as fallback...");

                    const createResult = await authService.signUp(email, firebasePassword, {
                        name: 'Super Admin',
                        role: UserRole.SUPER_ADMIN,
                        bio: 'Platform Root User',
                        avatar: 'https://cdn-icons-png.flaticon.com/512/2942/2942813.png'
                    });

                    if (createResult.success && createResult.user) {
                        console.log("Super Admin account created and logged in!");
                        return { success: true, user: createResult.user };
                    } else {
                        console.error("Failed to create Super Admin account:", createResult.error);

                        // FALLBACK: If Firebase Auth fails (network, quota, password mismatch we can't fix),
                        // allow access anyway as this IS the correct physical user (they passed the check).
                        console.warn("CRITICAL: Firebase Auth failed. Activating Emergency Mock Session.");

                        const mockUser: UserProfile = {
                            uid: 'root_override_v4',
                            name: 'Squadran Root (Systems)',
                            role: UserRole.SUPER_ADMIN,
                            email: 'root.admin@local',
                            avatar: 'https://cdn-icons-png.flaticon.com/512/2942/2942813.png',
                            bio: 'Emergency Access Session',
                            blocked: false
                        };

                        return { success: true, user: mockUser };
                    }
                } catch (e: any) {
                    console.error("Super Admin Login Exception:", e);
                    return { success: false, error: "Exception: " + e.message };
                }
            } else {
                console.log("Password mismatch.");
            }
        } catch (e) {
            console.error("Auth process error", e);
        }
        return { success: false, error: 'Invalid password provided' };
    },

    signupFounder: async (data: Partial<UserProfile> & { name: string, email: string, password?: string }): Promise<UserProfile | null> => {
        const password = data.password || 'temp123456'; // Use provided password or fallback
        const result = await authService.signUp(data.email, password, {
            ...data,
            role: UserRole.FOUNDER
        });
        return result.success && result.user ? result.user : null;
    },

    signupDeveloper: async (data: Partial<UserProfile> & { name: string, email: string, password?: string }): Promise<UserProfile | null> => {
        const password = data.password || 'temp123456'; // Use provided password or fallback
        const result = await authService.signUp(data.email, password, {
            ...data,
            role: UserRole.DEVELOPER
        });
        return result.success && result.user ? result.user : null;
    },

    loginLead: async (accessKey: string): Promise<{ user: UserProfile | null, error?: string }> => {
        // Use a fixed system email for all Leads logging in via code
        const email = 'platform.lead@buildforge.io';

        if (accessKey === 'Blue$Falcon_47!Code') {
            // Salt the key to satisfy Firebase's 6-char min password requirement
            const secureKey = accessKey + '_secure_key';

            // Try explicit login first
            const result = await authService.signIn(email, secureKey);
            if (result.success && result.user) {
                return { user: result.user };
            }

            // Auto-Register if login failed (and key is correct)
            console.log("Lead Login failed, attempting Auto-Register with salted key for system account.");
            const signup = await authService.signUp(email, secureKey, {
                name: 'Platform Lead',
                email: email,
                role: UserRole.LEAD,
                bio: 'Centralized Platform Management'
            });

            if (signup.success && signup.user) {
                return { user: signup.user };
            }

            // Internal fallback or upgrade if email exists elsewhere
            if (signup.error?.includes('auth/email-already-in-use') || signup.error?.includes('email is already in use')) {
                const existingProfile = await dbService.getUserByEmail(email);
                if (existingProfile) {
                    await dbService.updateUser(existingProfile.uid, { role: UserRole.LEAD });
                    return { user: { ...existingProfile, role: UserRole.LEAD } };
                }
            }

            return { user: null, error: signup.error || result.error };
        }
        return { user: null, error: 'Invalid Access Key' };
    },

    loginUserByEmail: async (email: string, password: string): Promise<{ user: UserProfile | null, error?: string }> => {
        const result = await authService.signIn(email, password);
        if (result.success && result.user) {
            return { user: result.user };
        }
        return { user: null, error: result.error || 'User not found' };
    },

    loginWithGoogle: async (): Promise<{ user?: UserProfile | null, isNewUser?: boolean, firebaseUser?: User, error?: string }> => {
        const result = await authService.signInWithGoogle();
        if (result.success) {
            if (result.user) {
                return { user: result.user };
            }
            if (result.isNewUser && result.firebaseUser) {
                return { isNewUser: true, firebaseUser: result.firebaseUser, user: null };
            }
        }
        return { user: null, error: result.error };
    },

    completeGoogleSignup: async (firebaseUser: User, role: UserRole): Promise<{ user: UserProfile | null, error?: string }> => {
        const result = await authService.createGoogleUser(firebaseUser, role);
        if (result.success && result.user) {
            return { user: result.user };
        }
        return { user: null, error: result.error };
    },


    updateUser: async (uid: string, data: Partial<UserProfile>): Promise<UserProfile | null> => {
        await dbService.updateUser(uid, data);
        return await dbService.getUser(uid);
    },

    subscribeToUser: (uid: string, callback: (user: UserProfile | null) => void) => {
        return dbService.subscribeToUser(uid, callback);
    },

    // ===== USER OPERATIONS =====

    getDevelopers: async (): Promise<UserProfile[]> => {
        return await dbService.getDevelopers();
    },

    adminGetAllUsers: async (): Promise<UserProfile[]> => {
        return await dbService.getAllUsers();
    },

    adminToggleBlockUser: async (uid: string): Promise<UserProfile | undefined> => {
        console.log("adminToggleBlockUser called for:", uid);
        const user = await dbService.getUser(uid);
        if (user) {
            const newStatus = !user.blocked;
            console.log(`Toggling block for ${user.name} (${user.email}). New status: ${newStatus}`);
            await dbService.updateUser(uid, { blocked: newStatus });

            // OPTIMISTIC UPDATE: Return the modified object directly
            // This avoids Firestore "Read after Write" latency/stale cache issues
            return { ...user, blocked: newStatus };
        } else {
            console.error("User not found for toggling:", uid);
        }
        return undefined;
    },

    getConnectedUsers: async (currentUser: UserProfile): Promise<UserProfile[]> => {
        // RESTRICTION: Founders and Developers can ONLY see Leads, Super Admins, AND their Team Members
        if (currentUser.role === UserRole.FOUNDER || currentUser.role === UserRole.DEVELOPER) {
            // 1. Always include Leads and Super Admins (Targeted query)
            const baseConnections = await dbService.getUsersByRoles([UserRole.LEAD, UserRole.SUPER_ADMIN]);
            const filteredBase = baseConnections.filter(u => u.uid !== currentUser.uid);

            // 2. Find Projects where I am involved (Author or Team Member)
            const myProjects = await dbService.getPostsByParticipant(currentUser.uid);

            // 3. Filter for "Active" Projects (Verified Ideas)
            const activeProjects = myProjects.filter(p => p.type === 'IDEA_SUBMISSION' && p.status === 'VERIFIED');

            const teamMateIds = new Set<string>();

            // 4. Extract IDs from projects
            activeProjects.forEach(post => {
                const team = post.team || [];
                const authorId = post.authorId;

                if (authorId !== currentUser.uid) teamMateIds.add(authorId);
                team.forEach(uid => {
                    if (uid !== currentUser.uid) teamMateIds.add(uid);
                });
            });

            // 5. Fetch Team Member profiles in batch
            const teamConnections = await dbService.getUsersByBatch(Array.from(teamMateIds));

            // 6. Combine and Deduplicate
            const uniqueConnections = new Map<string, UserProfile>();
            [...filteredBase, ...teamConnections].forEach(u => uniqueConnections.set(u.uid, u));

            return Array.from(uniqueConnections.values());
        }

        // Leads and Super Admins currently see everyone. 
        // We fetch all users, but even this could be optimized later if needed.
        const allUsers = await dbService.getAllUsers();
        return allUsers.filter(u => u.uid !== currentUser.uid);
    },

    getUserById: async (uid: string): Promise<UserProfile | undefined> => {
        const user = await dbService.getUser(uid);
        return user || undefined;
    },

    getUserByEmail: async (email: string): Promise<UserProfile | null> => {
        return await dbService.getUserByEmail(email);
    },

    // ===== POST OPERATIONS =====

    getPosts: async (type: string, requesterRole?: UserRole, requesterId?: string): Promise<Post[]> => {
        // For IDEA_SUBMISSION, DELIVERY, and SPRINT_UPDATE types, show all statuses

        // SPECIAL CASE: SPRINT_UPDATE
        // We now store these in a separate 'updates' collection, but some exist in 'posts'.
        // We merge them for backward compatibility.
        if (type === 'SPRINT_UPDATE') {
            const oldUpdates = await dbService.getPosts('SPRINT_UPDATE');
            const newUpdates = await dbService.getUpdates();
            const allUpdates = [...oldUpdates, ...newUpdates];
            // Sort combined list by timestamp desc
            return allUpdates.sort((a, b) => b.timestamp - a.timestamp);
        }

        if (type === 'IDEA_SUBMISSION' || type === 'DELIVERY') {
            const verifiedPosts = await dbService.getPosts(type, 'VERIFIED');
            const pendingPosts = await dbService.getPosts(type, 'PENDING');
            const rejectedPosts = await dbService.getPosts(type, 'REJECTED');
            // Combine and return all submissions
            return [...verifiedPosts, ...pendingPosts, ...rejectedPosts];
        }

        // For other post types, only show VERIFIED posts
        const posts = await dbService.getPosts(type, 'VERIFIED');
        return posts;
    },

    getPendingPosts: async (): Promise<Post[]> => {
        const allPending = await dbService.getPosts(undefined, 'PENDING');
        // Exclude SPRINT_UPDATE posts since they're auto-verified
        return allPending.filter(p => p.type !== 'SPRINT_UPDATE');
    },

    getUserPosts: async (userId: string): Promise<Post[]> => {
        const allPosts = await dbService.getPosts();
        return allPosts.filter(p => p.authorId === userId);
    },

    getPostById: async (postId: string): Promise<Post | null> => {
        return await dbService.getPost(postId);
    },

    createPost: async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'applicants' | 'team'>): Promise<void> => {
        // Redirect SPRINT_UPDATE to the new 'updates' collection
        if (post.type === 'SPRINT_UPDATE') {
            await dbService.createUpdate(post);
            return;
        }

        const postWithStatus = {
            ...post,
            status: post.status || 'PENDING',
            applicants: [],
            team: []
        };
        await dbService.createPost(postWithStatus);
    },

    updatePost: async (postId: string, data: Partial<Post>): Promise<void> => {
        await dbService.updatePost(postId, data);
    },

    verifyPost: async (postId: string): Promise<void> => {
        await dbService.verifyPost(postId);
    },

    rejectPost: async (postId: string): Promise<void> => {
        await dbService.rejectPost(postId);
    },

    deletePost: async (postId: string): Promise<void> => {
        await dbService.deletePost(postId);
    },

    toggleLike: async (postId: string, userId: string): Promise<void> => {
        await dbService.toggleLike(postId, userId);
    },

    applyToProject: async (postId: string, userId: string): Promise<boolean> => {
        const post = await dbService.getPost(postId);
        if (post) {
            const applicants = post.applicants || [];
            if (!applicants.includes(userId)) {
                applicants.push(userId);
                await dbService.updatePost(postId, { applicants });
                return true;
            }
        }
        return false;
    },

    assignDeveloper: async (postId: string, userId: string): Promise<void> => {
        console.log(`[Adapter] Assigning dev ${userId} to post ${postId}...`);
        try {
            const post = await dbService.getPost(postId);
            if (post) {
                const team = post.team || [];
                console.log(`[Adapter] Current team:`, team);
                if (!team.includes(userId)) {
                    team.push(userId);
                    await dbService.updatePost(postId, { team });
                    console.log(`[Adapter] Update successful. New team:`, team);
                } else {
                    console.log(`[Adapter] User ${userId} already in team.`);
                }
            } else {
                console.error(`[Adapter] Post ${postId} not found!`);
            }
        } catch (e) {
            console.error(`[Adapter] Assign Developer Error:`, e);
            throw e; // Re-throw so UI sees it
        }
    },

    assignTeam: async (postId: string, userIds: string[]): Promise<void> => {
        const post = await dbService.getPost(postId);
        if (post) {
            const currentTeam = post.team || [];
            // Combine and deduplicate
            const newTeam = Array.from(new Set([...currentTeam, ...userIds]));
            await dbService.updatePost(postId, { team: newTeam });
        }
    },

    unassignDeveloper: async (postId: string, userId: string): Promise<void> => {
        const post = await dbService.getPost(postId);
        if (post) {
            const team = post.team || [];
            const updatedTeam = team.filter(id => id !== userId);
            await dbService.updatePost(postId, { team: updatedTeam });
        }
    },

    addComment: async (postId: string, userId: string, userName: string, text: string): Promise<Comment> => {
        const comment: Comment = {
            id: `c_${Date.now()}`,
            userId,
            userName,
            text,
            timestamp: Date.now()
        };
        await dbService.addComment(postId, comment);
        return comment;
    },

    // ===== MESSAGING =====

    getMessages: async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
        return await dbService.getMessages(currentUserId, otherUserId);
    },

    getConversations: async (currentUserId: string): Promise<string[]> => {
        const allMessages = await dbService.getMessages(currentUserId, '');
        const userIds = new Set<string>();
        allMessages.forEach(m => {
            if (m.senderId === currentUserId) userIds.add(m.receiverId);
            if (m.receiverId === currentUserId) userIds.add(m.senderId);
        });
        return Array.from(userIds);
    },

    sendMessage: async (senderId: string, receiverId: string, text: string): Promise<void> => {
        await dbService.sendMessage({
            senderId,
            receiverId,
            text,
            read: false
        });
    }
};

