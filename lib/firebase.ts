// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC5DJisT4VQTKqRXASLmv9UAxtv6zFDA7k",
    authDomain: "debe-portal.firebaseapp.com",
    projectId: "debe-portal",
    storageBucket: "debe-portal.firebasestorage.app",
    messagingSenderId: "181561430753",
    appId: "1:181561430753:web:67e4135b74cdda873c9da0"
  };

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db,storage };
export { app };