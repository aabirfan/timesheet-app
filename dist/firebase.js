// firebase.js — central Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAg7pDyFSEhWuubd0EbbcoCJDyDfUTbzqE",
  authDomain: "timesheet-app-549aa.firebaseapp.com",
  projectId: "timesheet-app-549aa",
  storageBucket: "timesheet-app-549aa.appspot.com",
  messagingSenderId: "119878076917",
  appId: "1:119878076917:web:ac21779b711c9ebfc3f8bc",
  measurementId: "G-H1D5L9VCEZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Emulators are opt-in so Google OAuth works locally by default.
// Use `?emulator=1` in the URL (e.g. http://127.0.0.1:5002/?emulator=1)
// when you explicitly want to point the app at local emulators.
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const useEmulators = isLocalhost && new URLSearchParams(window.location.search).get('emulator') === '1';

if (useEmulators) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Firebase] Connected to emulators');
  } catch (err) {
    // Emulators already connected, ignore
    if (!err.message.includes('already been initialized')) {
      console.warn('[Firebase] Emulator connection error:', err);
    }
  }
}

export { app, auth, db };
