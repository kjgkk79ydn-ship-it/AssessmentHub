// firebase.js
// Connects AssessmentHub to Firebase Authentication and Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACjKohmepXGjJGVO-IP3rdsfOJ3aNST0g",
  authDomain: "assesmenthub-42c43.firebaseapp.com",
  projectId: "assesmenthub-42c43",
  storageBucket: "assesmenthub-42c43.firebasestorage.app",
  messagingSenderId: "276392400546",
  appId: "1:276392400546:web:eeac4ec13b4f55d6af29fb"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };