import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdbG0aTGWYvgmana3x7sNzMFzPou6Pd24",
  authDomain: "life-app-76d10.firebaseapp.com",
  databaseURL: "https://life-app-76d10-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "life-app-76d10",
  storageBucket: "life-app-76d10.firebasestorage.app",
  messagingSenderId: "952512126889",
  appId: "1:952512126889:web:5d6962c29332bc3b7e6eb8"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously
signInAnonymously(auth).catch(error => {
  console.error("Firebase auth error:", error);
});

export { database, ref, set, get, onValue };
