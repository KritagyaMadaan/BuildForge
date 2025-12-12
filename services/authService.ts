import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserRole, UserProfile } from '../types';

export const authService = {
    // Sign up new user
    async signUp(email: string, password: string, userData: Partial<UserProfile>) {
        try {
            // Create auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            const userProfile: UserProfile = {
                uid: user.uid,
                email: email,
                name: userData.name || '',
                role: userData.role || UserRole.FOUNDER,
                avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}`,
                blocked: false,
                ...userData
            };

            await setDoc(doc(db, 'users', user.uid), userProfile);

            return { success: true, user: userProfile };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Sign in existing user
    async signIn(email: string, password: string) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                const userProfile = userDoc.data() as UserProfile;

                // Check if blocked
                if (userProfile.blocked) {
                    await signOut(auth);
                    return { success: false, error: 'Account is blocked' };
                }

                return { success: true, user: userProfile };
            } else {
                return { success: false, error: 'User profile not found' };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;

            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                const userProfile = userDoc.data() as UserProfile;

                // Check if blocked
                if (userProfile.blocked) {
                    await signOut(auth);
                    return { success: false, error: 'Account is blocked' };
                }

                return { success: true, user: userProfile };
            } else {
                // Return new user flag instead of auto-creating
                return { success: true, isNewUser: true, firebaseUser: user };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Complete Google Sign Up with detected role
    async createGoogleUser(firebaseUser: User, role: UserRole) {
        try {
            const userProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: role,
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}`,
                blocked: false
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
            return { success: true, user: userProfile };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Sign out
    async signOut() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    // Listen to auth state changes
    onAuthChange(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }
};
