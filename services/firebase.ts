import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAAKFAxjpsJf62gmPFo5wb8aRhMxuc9UMs",
    authDomain: "buildforge-b941b.firebaseapp.com",
    projectId: "buildforge-b941b",
    storageBucket: "buildforge-b941b.firebasestorage.app",
    messagingSenderId: "773147332651",
    appId: "1:773147332651:web:8e02f5b24c061882491a6e",
    measurementId: "G-0HLFCJG5ZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
