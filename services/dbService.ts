import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    or,
    limit,
    getCountFromServer,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, Post, Comment, Message, UserRole } from '../types';

export const dbService = {
    // ===== USER OPERATIONS =====

    async getUser(uid: string): Promise<UserProfile | null> {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as UserProfile : null;
    },

    subscribeToUser(uid: string, callback: (user: UserProfile | null) => void) {
        return onSnapshot(doc(db, 'users', uid), (doc) => {
            if (doc.exists()) {
                callback({ uid: doc.id, ...doc.data() } as UserProfile);
            } else {
                callback(null);
            }
        });
    },

    async getUserByEmail(email: string): Promise<UserProfile | null> {
        const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { uid: doc.id, ...doc.data() } as UserProfile;
        }
        return null;
    },

    async updateUser(uid: string, data: Partial<UserProfile>) {
        await updateDoc(doc(db, 'users', uid), data);
    },

    async deleteUser(uid: string) {
        console.log(`[dbService] Starting safe deletion for user ${uid}...`);

        // 1. Unlink authored posts
        const authoredPostsQuery = query(collection(db, 'posts'), where('authorId', '==', uid));
        const authoredPostsSnapshot = await getDocs(authoredPostsQuery);

        // 2. Remove from teams
        const teamPostsQuery = query(collection(db, 'posts'), where('team', 'array-contains', uid));
        const teamPostsSnapshot = await getDocs(teamPostsQuery);

        // Execute updates individually to avoid batch limits or complex transactions
        // (Batch limit is 500, unlikely to hit here but safer to just loop for this prototype)

        const updatePromises: Promise<any>[] = [];

        // Anonymize Authored Posts
        authoredPostsSnapshot.docs.forEach(docSnapshot => {
            updatePromises.push(updateDoc(doc(db, 'posts', docSnapshot.id), {
                authorId: `deleted_${uid}`,
                authorName: 'Former User' // Optional: Cache name for display if we wanted, but "Former User" is fine
            }));
        });

        // Remove from Teams
        teamPostsSnapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const newTeam = (data.team || []).filter((id: string) => id !== uid);
            updatePromises.push(updateDoc(doc(db, 'posts', docSnapshot.id), { team: newTeam }));
        });

        await Promise.all(updatePromises);

        // 3. Finally, delete the user profile
        await deleteDoc(doc(db, 'users', uid));
        console.log(`[dbService] User ${uid} deleted and content unlinked.`);
    },

    async getAllUsers(): Promise<UserProfile[]> {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    },

    async getDevelopers(): Promise<UserProfile[]> {
        console.log("[dbService] Fetching developers using query (limit 20)...");
        try {
            // ALWAYS LIMIT collection reads
            const q = query(
                collection(db, 'users'),
                where('role', '==', UserRole.DEVELOPER),
                where('blocked', '==', false),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const devs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            console.log("[dbService] Found Developers:", devs.length);
            return devs;
        } catch (error) {
            console.error("[dbService] Error fetching developers:", error);
            return [];
        }
    },

    async getUsersByRoles(roles: UserRole[]): Promise<UserProfile[]> {
        const q = query(collection(db, 'users'), where('role', 'in', roles));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    },

    async getUsersByBatch(uids: string[]): Promise<UserProfile[]> {
        if (uids.length === 0) return [];
        // Firestore 'in' query is limited to 30 items
        const batches = [];
        for (let i = 0; i < uids.length; i += 30) {
            batches.push(uids.slice(i, i + 30));
        }

        const results: UserProfile[] = [];
        for (const batch of batches) {
            const q = query(collection(db, 'users'), where('uid', 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => results.push({ uid: doc.id, ...doc.data() } as UserProfile));
        }
        return results;
    },

    // ===== POST OPERATIONS =====

    async createPost(postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments'>) {
        const postsRef = collection(db, 'posts');
        const newPost = {
            ...postData,
            timestamp: serverTimestamp(),
            likes: 0,
            likedBy: [],
            comments: [],
            status: 'PENDING',
            applicants: [],
            team: []
        };

        const docRef = await addDoc(postsRef, newPost);
        return docRef.id;
    },

    async createUpdate(postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments'>) {
        const updatesRef = collection(db, 'updates');
        // Updates don't need likes/comments as per request, but we keep structure consistent for type safety
        const newUpdate = {
            ...postData,
            timestamp: serverTimestamp(),
            // Even if UI hides them, we initialize them to avoid undefined errors if accidentally accessed
            likes: 0,
            likedBy: [],
            comments: [],
            status: 'VERIFIED', // Updates are auto-verified? Usually yes.
            applicants: [],
            team: []
        };

        const docRef = await addDoc(updatesRef, newUpdate);
        return docRef.id;
    },

    async getPosts(type?: string, status?: string): Promise<Post[]> {
        // ALWAYS LIMIT fetch to 20 to prevent unbounded read spikes
        const constraints: any[] = [limit(20)];
        if (type) constraints.push(where('type', '==', type));
        if (status) constraints.push(where('status', '==', status));

        // Default sort by timestamp if no specific constraints require it (Firestore needs index for composite)
        // For simple collection reads, we can use orderBy
        let q;
        if (constraints.length === 1) { // Just limit
            q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(20));
        } else {
            q = query(collection(db, 'posts'), ...constraints);
        }

        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp && typeof data.timestamp.toMillis === 'function') ? (data.timestamp as Timestamp).toMillis() : Date.now()
            } as Post;
        });

        // Sort in memory (or add orderBy to query if index exists)
        return posts.sort((a, b) => b.timestamp - a.timestamp);
    },

    async getPostsByParticipant(uid: string): Promise<Post[]> {
        // Fetch posts where user is author OR user is in team
        const q = query(
            collection(db, 'posts'),
            or(
                where('authorId', '==', uid),
                where('team', 'array-contains', uid)
            )
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp && typeof (doc.data().timestamp as any).toMillis === 'function') ? (doc.data().timestamp as Timestamp).toMillis() : Date.now()
        } as Post));
    },

    async getUpdates(): Promise<Post[]> {
        const q = query(collection(db, 'updates'), orderBy('timestamp', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toMillis() || Date.now()
            } as Post;
        });
    },

    async getPost(postId: string): Promise<Post | null> {
        // Try 'posts' first
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
            return {
                id: postDoc.id,
                ...postDoc.data(),
                timestamp: (postDoc.data().timestamp as Timestamp)?.toMillis() || Date.now()
            } as Post;
        }

        // Try 'updates' fallback
        const updateDocRef = await getDoc(doc(db, 'updates', postId));
        if (updateDocRef.exists()) {
            return {
                id: updateDocRef.id,
                ...updateDocRef.data(),
                timestamp: (updateDocRef.data().timestamp as Timestamp)?.toMillis() || Date.now()
            } as Post;
        }

        return null;
    },

    async updatePost(postId: string, data: Partial<Post>) {
        try {
            await updateDoc(doc(db, 'posts', postId), data);
        } catch (e) {
            // If failed (likely not found in posts), try updates
            await updateDoc(doc(db, 'updates', postId), data);
        }
    },

    async deletePost(postId: string) {
        try {
            await deleteDoc(doc(db, 'posts', postId));
        } catch (e) {
            await deleteDoc(doc(db, 'updates', postId));
        }
    },

    async verifyPost(postId: string) {
        // Get the post to analyze
        const post = await this.getPost(postId);
        if (!post) {
            throw new Error('Post not found');
        }

        // Use founder-provided tech stack if available, otherwise use a default
        const techStack = post.techStack && post.techStack.length > 0
            ? post.techStack
            : ['React', 'Node.js', 'Firebase']; // Fallback if no tech stack provided

        const collectionName = (await getDoc(doc(db, 'posts', postId))).exists() ? 'posts' : 'updates';

        await updateDoc(doc(db, collectionName, postId), {
            status: 'VERIFIED',
            mvp: {
                description: `MVP for ${post.title || 'this project'}`,
                techStack: techStack,
                documentation: '#',
                status: 'READY',
                architecture: 'Modern Web Application',
                rationale: 'Tech stack specified by the founder',
                schemaImage: post.schemaImage
            }
        });
    },

    async rejectPost(postId: string) {
        try {
            await deleteDoc(doc(db, 'posts', postId));
        } catch (e) {
            await deleteDoc(doc(db, 'updates', postId));
        }
    },

    async addComment(postId: string, comment: Comment) {
        // SUBCOLLECTION: Move comments to nested collection to avoid document size bloat
        const commentRef = collection(db, 'posts', postId, 'comments');
        await addDoc(commentRef, {
            ...comment,
            timestamp: serverTimestamp() // Use server time for consistency
        });
    },

    async getComments(postId: string): Promise<Comment[]> {
        const q = query(collection(db, 'posts', postId, 'comments'), orderBy('timestamp', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    },

    async toggleLike(postId: string, userId: string) {
        // SUBCOLLECTION: Use a doc in 'likes' subcollection as a marker
        // This is 1 read to check, 1 write to toggle. Much cleaner than array filtering.
        const likeRef = doc(db, 'posts', postId, 'likes', userId);
        const likeDoc = await getDoc(likeRef);

        if (likeDoc.exists()) {
            await deleteDoc(likeRef);
        } else {
            await setDoc(likeRef, { timestamp: serverTimestamp() });
        }
    },

    async getLikesCount(postId: string): Promise<number> {
        // PERF: getCountFromServer is 1/1000th the cost of reading documents
        const coll = collection(db, 'posts', postId, 'likes');
        const snapshot = await getCountFromServer(coll);
        return snapshot.data().count;
    },

    async hasLiked(postId: string, userId: string): Promise<boolean> {
        const likeRef = doc(db, 'posts', postId, 'likes', userId);
        const likeDoc = await getDoc(likeRef);
        return likeDoc.exists();
    },

    // ===== MESSAGING =====

    // Helper for messaging consistency
    getConversationId(uid1: string, uid2: string) {
        return [uid1, uid2].sort().join('_');
    },

    async sendMessage(message: Omit<Message, 'id' | 'timestamp'>) {
        console.log("[dbService] Sending message:", message);
        const convId = this.getConversationId(message.senderId, message.receiverId);
        const messagesRef = collection(db, 'messages');
        await addDoc(messagesRef, {
            ...message,
            conversationId: convId,
            participants: [message.senderId, message.receiverId],
            timestamp: serverTimestamp(),
            read: false
        });
    },

    async getMessages(userId1: string, userId2: string): Promise<Message[]> {
        console.log(`[dbService] getMessages: ${userId1} <-> ${userId2 || 'ALL'}`);

        // CASE 1: Fetching specific conversation (userId2 provided)
        if (userId2) {
            const convId = this.getConversationId(userId1, userId2);

            // OPTIMIZED: Try conversationId query first
            let q = query(
                collection(db, 'messages'),
                where('conversationId', '==', convId),
                orderBy('timestamp', 'asc'),
                limit(30)
            );

            let snapshot = await getDocs(q);

            // FALLBACK: If no results, try legacy OR query
            if (snapshot.empty) {
                console.log('[dbService] No messages with conversationId, trying legacy query...');
                q = query(
                    collection(db, 'messages'),
                    or(
                        where('senderId', '==', userId1),
                        where('receiverId', '==', userId1)
                    ),
                    limit(50)
                );
                snapshot = await getDocs(q);

                // LAZY MIGRATION for specific conversation
                if (!snapshot.empty) {
                    const batch = writeBatch(db);
                    let migrationCount = 0;
                    snapshot.docs.forEach(docSnap => {
                        const data = docSnap.data();
                        // Only migrate messages for THIS conversation to be safe
                        if (!data.conversationId &&
                            ((data.senderId === userId1 && data.receiverId === userId2) ||
                                (data.senderId === userId2 && data.receiverId === userId1))) {
                            const docConvId = this.getConversationId(data.senderId, data.receiverId);
                            batch.update(docSnap.ref, { conversationId: docConvId });
                            migrationCount++;
                        }
                    });
                    if (migrationCount > 0) {
                        try { await batch.commit(); } catch (e) { console.error("Migration failed", e); }
                    }
                }
            }

            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp)?.toMillis() || Date.now() } as Message))
                .filter(m => (m.senderId === userId1 && m.receiverId === userId2) || (m.senderId === userId2 && m.receiverId === userId1))
                .sort((a, b) => a.timestamp - b.timestamp);
        }

        // CASE 2: Fetching ALL messages for user (userId2 missing) - Used for Conversation List
        // We cannot use conversationId here easily. We must use a broad query.
        console.log('[dbService] Fetching ALL messages for user to build conversation list');
        const q = query(
            collection(db, 'messages'),
            or(
                where('senderId', '==', userId1),
                where('receiverId', '==', userId1)
            ),
            orderBy('timestamp', 'desc'), // Get most recent first
            limit(100) // Limit to 100 most recent to build the list
        );

        let snapshot;
        try {
            snapshot = await getDocs(q);
        } catch (e) {
            console.warn("[dbService] Index missing for OR+OrderBy? Falling back to unsorted query.");
            // Fallback if index missing: fetch without sort, sort in memory
            const q2 = query(
                collection(db, 'messages'),
                or(
                    where('senderId', '==', userId1),
                    where('receiverId', '==', userId1)
                ),
                limit(100)
            );
            snapshot = await getDocs(q2);
        }

        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), timestamp: (doc.data().timestamp as Timestamp)?.toMillis() || Date.now() } as Message))
            .sort((a, b) => a.timestamp - b.timestamp);
    },

    subscribeToMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void) {
        if (!userId2) return () => { };
        // CRITICAL FIX: Real-time listener must be synchronous.
        // We use a broader OR query to ensure we catch ALL messages (legacy + new).
        // Optimizing this strictly with conversationId requires a guaranteed migration first.
        // For now, correct behavior > perfection.

        const q = query(
            collection(db, 'messages'),
            or(
                where('senderId', '==', userId1),
                where('receiverId', '==', userId1)
            )
            // No limit here to ensure we don't miss the specific conversation if user has many others
            // No orderBy ensures we don't hit missing index issues
        );

        return onSnapshot(q, (snapshot) => {
            // Lazy migration check (non-blocking)
            // We verify if data is migrated, if not, we trigger a background update
            snapshot.docs.forEach(async (docSnap) => {
                const data = docSnap.data();
                if (!data.conversationId) {
                    const docConvId = [data.senderId, data.receiverId].sort().join('_');
                    try {
                        // Use dbService directly to avoid circular dependency if using 'this' blindly
                        // But here we are inside the object.
                        await updateDoc(docSnap.ref, { conversationId: docConvId });
                    } catch (e) {
                        // Ignore update errors (permissions etc)
                    }
                }
            });

            const messages = snapshot.docs
                .map(doc => {
                    const data = doc.data() as any;
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: (data.timestamp as Timestamp)?.toMillis() || Date.now()
                    } as Message;
                })
                .filter(m => {
                    // Client-side filtering for the specific chat partner
                    return (m.senderId === userId1 && m.receiverId === userId2) ||
                        (m.senderId === userId2 && m.receiverId === userId1);
                })
                .sort((a, b) => a.timestamp - b.timestamp);

            callback(messages);
        }, (err) => {
            console.error("[dbService] Message Subscription Error:", err);
        });
    }
};

// Helper function for tech stack recommendations
interface TechStackRecommendation {
    description: string;
    techStack: string[];
    architecture: string;
    rationale: string;
}

const getTechStackRecommendation = (title: string, description: string): TechStackRecommendation => {
    const combined = `${title} ${description}`.toLowerCase();

    // Mobile app detection
    if (combined.includes('mobile') || combined.includes('ios') || combined.includes('android') || combined.includes('app')) {
        return {
            description: 'Cross-platform mobile app with cloud backend and real-time sync.',
            techStack: ['React Native', 'Expo', 'Firebase', 'TypeScript'],
            architecture: 'Mobile-first with Cloud Backend',
            rationale: 'React Native enables cross-platform development with native performance and Firebase provides scalable backend.'
        };
    }

    // Game detection
    if (combined.includes('game') || combined.includes('gaming') || combined.includes('3d') || combined.includes('unity')) {
        return {
            description: 'Interactive game with real-time multiplayer and cloud saves.',
            techStack: ['Unity', 'Photon', 'PlayFab', 'C#'],
            architecture: 'Game Engine with Cloud Services',
            rationale: 'Unity provides powerful game development tools with Photon for networking and PlayFab for backend services.'
        };
    }

    // API/Backend detection
    if (combined.includes('api') || combined.includes('backend') || combined.includes('server') || combined.includes('microservice')) {
        return {
            description: 'Scalable REST API with database and authentication.',
            techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker'],
            architecture: 'RESTful Microservices',
            rationale: 'Node.js offers high performance for APIs with PostgreSQL for data persistence and Redis for caching.'
        };
    }

    // E-commerce detection
    if (combined.includes('shop') || combined.includes('store') || combined.includes('ecommerce') || combined.includes('payment')) {
        return {
            description: 'Scalable e-commerce platform with payments and inventory management.',
            techStack: ['Next.js', 'Stripe', 'PostgreSQL', 'Vercel'],
            architecture: 'Serverless with Edge Functions',
            rationale: 'Next.js provides SEO-optimized storefront, Stripe handles payments, and Vercel offers global CDN.'
        };
    }

    // Real-time/Chat detection
    if (combined.includes('chat') || combined.includes('messaging') || combined.includes('real-time') || combined.includes('live')) {
        return {
            description: 'Real-time communication platform with message persistence.',
            techStack: ['Socket.io', 'React', 'MongoDB', 'Express'],
            architecture: 'WebSocket-based Real-time',
            rationale: 'Socket.io enables bidirectional real-time communication with MongoDB for flexible message storage.'
        };
    }

    // Default: Modern web app
    return {
        description: 'Modern web application with real-time data sync and scalable architecture.',
        techStack: ['React', 'Firebase', 'Node.js', 'TailwindCSS'],
        architecture: 'Serverless SPA with Cloud Backend',
        rationale: 'React provides fast UI, Firebase offers real-time database and auth, TailwindCSS ensures responsive design.'
    };
};
