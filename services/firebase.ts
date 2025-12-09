import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDfleWc7HLFWECp1_mwSOjjQk5JBgdpw5Q",
    authDomain: "buildforge-c29e1.firebaseapp.com",
    projectId: "buildforge-c29e1",
    storageBucket: "buildforge-c29e1.firebasestorage.app",
    messagingSenderId: "736357935832",
    appId: "1:736357935832:web:e36b35d6c766ad8e7f85ad",
    measurementId: "G-9P6P1YFBK6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;