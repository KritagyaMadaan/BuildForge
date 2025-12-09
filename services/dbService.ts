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
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, Post, Comment, Message, UserRole } from '../types';

export const dbService = {
    // ===== USER OPERATIONS =====

    async getUser(uid: string): Promise<UserProfile | null> {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as UserProfile : null;
    },

    async updateUser(uid: string, data: Partial<UserProfile>) {
        await updateDoc(doc(db, 'users', uid), data);
    },

    async getAllUsers(): Promise<UserProfile[]> {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    },

    async getDevelopers(): Promise<UserProfile[]> {
        console.log("[dbService] Fetching all users to find developers...");
        try {
            // Fetch ALL users first to avoid potential missing index issues with composite queries
            const snapshot = await getDocs(collection(db, 'users'));
            const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

            console.log("[dbService] Total users in DB:", allUsers.length);
            // Log roles to see what's actually there
            allUsers.forEach(u => console.log(`- User: ${u.name} | Role: ${u.role} | Blocked: ${u.blocked}`));

            const devs = allUsers.filter(u => u.role === UserRole.DEVELOPER && !u.blocked);
            console.log("[dbService] Found Developers:", devs.length);
            return devs;
        } catch (error) {
            console.error("[dbService] Error fetching developers:", error);
            return [];
        }
    },

    // ===== POST OPERATIONS =====

    async createPost(postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments'>) {
        const postsRef = collection(db, 'posts');
        const newPost = {
            ...postData,
            timestamp: serverTimestamp(),
            likes: 0,
            comments: [],
            status: 'PENDING',
            applicants: [],
            team: []
        };

        const docRef = await addDoc(postsRef, newPost);
        return docRef.id;
    },

    async getPosts(type?: string, status?: string): Promise<Post[]> {
        // Fetch ALL posts and filter in memory to avoid Firestore index issues
        const q = query(collection(db, 'posts'));
        const snapshot = await getDocs(q);

        let posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp && typeof (doc.data().timestamp as any).toMillis === 'function') ? (doc.data().timestamp as Timestamp).toMillis() : Date.now()
        } as Post));

        if (type) {
            posts = posts.filter(p => p.type === type);
        }
        if (status) {
            posts = posts.filter(p => p.status === status);
        }

        // Sort in memory
        return posts.sort((a, b) => b.timestamp - a.timestamp);
    },

    async getPost(postId: string): Promise<Post | null> {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
            return {
                id: postDoc.id,
                ...postDoc.data(),
                timestamp: (postDoc.data().timestamp as Timestamp)?.toMillis() || Date.now()
            } as Post;
        }
        return null;
    },

    async updatePost(postId: string, data: Partial<Post>) {
        await updateDoc(doc(db, 'posts', postId), data);
    },

    async deletePost(postId: string) {
        await deleteDoc(doc(db, 'posts', postId));
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

        await updateDoc(doc(db, 'posts', postId), {
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
        await deleteDoc(doc(db, 'posts', postId));
    },

    async addComment(postId: string, comment: Comment) {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
            const comments = postDoc.data().comments || [];
            comments.push(comment);
            await updateDoc(postRef, { comments });
        }
    },

    async toggleLike(postId: string) {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
            const currentLikes = postDoc.data().likes || 0;
            await updateDoc(postRef, { likes: currentLikes + 1 });
        }
    },

    // ===== MESSAGING =====

    async sendMessage(message: Omit<Message, 'id' | 'timestamp'>) {
        const messagesRef = collection(db, 'messages');
        await addDoc(messagesRef, {
            ...message,
            timestamp: serverTimestamp(),
            read: false
        });
    },

    async getMessages(userId1: string, userId2: string): Promise<Message[]> {
        const q = query(
            collection(db, 'messages'),
            orderBy('timestamp', 'asc')
        );

        const snapshot = await getDocs(q);
        const messages = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: (doc.data().timestamp as Timestamp)?.toMillis() || Date.now()
            } as Message))
            .filter(m => {
                if (!userId2) {
                    return m.senderId === userId1 || m.receiverId === userId1;
                }
                return (m.senderId === userId1 && m.receiverId === userId2) ||
                    (m.senderId === userId2 && m.receiverId === userId1);
            });

        return messages;
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