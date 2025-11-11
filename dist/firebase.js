// firebase.js — central Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

export { app, auth, db };
