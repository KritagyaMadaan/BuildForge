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

            return await this._createUserProfile(user, email, userData);
        } catch (error: any) {
            // HANDLE ZOMBIE USERS (Deleted Profile but Auth Exists)
            if (error.code === 'auth/email-already-in-use') {
                console.log("Email in use, checking for Zombie User (Deleted Profile)...");
                try {
                    // 1. Try to sign in with the provided credentials
                    const credential = await signInWithEmailAndPassword(auth, email, password);
                    const user = credential.user;

                    // 2. Check if profile exists
                    const userDoc = await getDoc(doc(db, 'users', user.uid));

                    if (!userDoc.exists()) {
                        console.log("Zombie User Detected: Auth exists but Profile is missing. Resurrecting...");
                        // 3. Profile is missing! This is a "Removed" user trying to come back.
                        // We strictly allow this as a "New Registration" reusing the UID.
                        return await this._createUserProfile(user, email, userData);
                    } else {
                        // Profile exists, so this is just a regular "Email Taken" error
                        return { success: false, error: "Email is already in use by an active account." };
                    }
                } catch (signInError: any) {
                    // Wrong password or other sign-in error implies it's not the owner trying to re-register
                    console.error("Zombie Check Failed:", signInError);
                    return { success: false, error: "Email already in use. If this is you, please check your password." };
                }
            }

            return { success: false, error: error.message };
        }
    },

    // Helper to create profile (Shared logic)
    async _createUserProfile(user: User, email: string, userData: Partial<UserProfile>) {
        try {
            // Clean undefined values from userData to prevent Firestore crashes
            const cleanUserData = Object.fromEntries(
                Object.entries(userData).filter(([_, v]) => v !== undefined)
            );

            // Create user profile in Firestore
            const userProfile: UserProfile = {
                uid: user.uid,
                email: email,
                name: userData.name || '',
                role: userData.role || UserRole.FOUNDER,
                avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}`,
                blocked: false,
                ...cleanUserData
            };

            await setDoc(doc(db, 'users', user.uid), userProfile);

            return { success: true, user: userProfile };
        } catch (e: any) {
            return { success: false, error: e.message };
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
    async createGoogleUser(firebaseUser: User, role: UserRole, additionalData?: Partial<UserProfile>) {
        try {
            const userProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: role,
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}`,
                blocked: false,
                ...additionalData
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
