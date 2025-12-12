// Firebase Adapter - bridges the gap between old mock API and new Firebase API
import { User } from 'firebase/auth';
import { authService } from './authService';
import { dbService } from './dbService';
import { UserProfile, Post, UserRole, Comment, Message } from '../types';

export const db = {
    // ===== AUTHENTICATION =====

    loginSuperAdmin: async (password: string): Promise<{ success: boolean, user?: UserProfile, error?: string }> => {
        console.log("Attempting Super Admin login with password length:", password.length);

        // For super admin, we'll use a special email
        if (password.toLowerCase() === 'squadran_root') {
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
                    // allow access anyway as this IS the correct physical user (they passed the 'squadran_root' check).
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
            console.log("Password mismatch. Expected 'squadran_root', got:", password);
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

    loginLead: async (email: string, accessKey: string): Promise<{ user: UserProfile | null, error?: string }> => {
        if (accessKey === 'admin') {
            // Salt the key to satisfy Firebase's 6-char min password requirement
            const secureKey = accessKey + '_secure_key';

            // Try explicit login first
            const result = await authService.signIn(email, secureKey);
            if (result.success && result.user) {
                return { user: result.user };
            }

            // Auto-Register if login failed (and key is correct)
            console.log("Lead Login failed, attempting Auto-Register with salted key for:", email);
            const signup = await authService.signUp(email, secureKey, {
                name: email.split('@')[0], // Auto-generate name from email
                email: email,
                role: UserRole.LEAD,
                bio: 'Platform Lead'
            });

            if (signup.success && signup.user) {
                return { user: signup.user };
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
        const allUsers = await dbService.getAllUsers();

        // RESTRICTION: Founders and Developers can ONLY see Leads, Super Admins, AND their Team Members
        if (currentUser.role === UserRole.FOUNDER || currentUser.role === UserRole.DEVELOPER) {
            // 1. Always include Leads and Super Admins
            const baseConnections = allUsers.filter(u =>
                u.uid !== currentUser.uid &&
                (u.role === UserRole.LEAD || u.role === UserRole.SUPER_ADMIN)
            );

            // 2. Find "Active" Projects (Verified Ideas)
            // Only active ideas allow communication. Delivered projects (Final Project) sever the link.
            const activeProjects = await dbService.getPosts('IDEA_SUBMISSION', 'VERIFIED');

            // We do NOT fetch 'DELIVERY' posts here, purposefully restricting communication.
            const allRelevantProjects = [...activeProjects];

            const teamMateIds = new Set<string>();

            // 3. Check each project for relationship
            allRelevantProjects.forEach(post => {
                const team = post.team || [];
                const authorId = post.authorId;

                // Am I the Founder?
                const isMyProject = authorId === currentUser.uid;

                // Am I on the Team?
                const isOnTeam = team.includes(currentUser.uid);

                if (isMyProject || isOnTeam) {
                    // Add everyone involved to my connections
                    if (authorId !== currentUser.uid) teamMateIds.add(authorId); // Add Founder
                    team.forEach(uid => {
                        if (uid !== currentUser.uid) teamMateIds.add(uid); // Add Team Members
                    });
                }
            });

            // 4. Map IDs to User Profiles
            const teamConnections = allUsers.filter(u => teamMateIds.has(u.uid));

            // 5. Combine and Deduplicate
            const uniqueConnections = new Map<string, UserProfile>();
            [...baseConnections, ...teamConnections].forEach(u => uniqueConnections.set(u.uid, u));

            return Array.from(uniqueConnections.values());
        }

        // Leads and Super Admins can see everyone
        return allUsers.filter(u => u.uid !== currentUser.uid);
    },

    getUserById: async (uid: string): Promise<UserProfile | undefined> => {
        const user = await dbService.getUser(uid);
        return user || undefined;
    },

    // ===== POST OPERATIONS =====

    getPosts: async (type: string, requesterRole?: UserRole, requesterId?: string): Promise<Post[]> => {
        // For IDEA_SUBMISSION type, show VERIFIED, PENDING, and REJECTED posts
        // This allows founders to see their own pending and rejected ideas
        if (type === 'IDEA_SUBMISSION') {
            const verifiedPosts = await dbService.getPosts(type, 'VERIFIED');
            const pendingPosts = await dbService.getPosts(type, 'PENDING');
            const rejectedPosts = await dbService.getPosts(type, 'REJECTED');
            // Combine and return all idea submissions
            return [...verifiedPosts, ...pendingPosts, ...rejectedPosts];
        }

        // For other post types, only show VERIFIED posts
        const posts = await dbService.getPosts(type, 'VERIFIED');
        return posts;
    },

    getPendingPosts: async (): Promise<Post[]> => {
        return await dbService.getPosts(undefined, 'PENDING');
    },

    getUserPosts: async (userId: string): Promise<Post[]> => {
        const allPosts = await dbService.getPosts();
        return allPosts.filter(p => p.authorId === userId);
    },

    createPost: async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'status' | 'applicants' | 'team'>): Promise<void> => {
        const postWithStatus = {
            ...post,
            status: 'PENDING' as const,
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

    toggleLike: async (postId: string): Promise<void> => {
        await dbService.toggleLike(postId);
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
