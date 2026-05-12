import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  connectFirestoreEmulator,
  runTransaction,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgn1ZE-v7g0ZQo7jwewac4IewxwGwDAaE",
  authDomain: "locacao-tamura.firebaseapp.com",
  projectId: "locacao-tamura",
  storageBucket: "locacao-tamura.firebasestorage.app",
  messagingSenderId: "464677171907",
  appId: "1:464677171907:web:e341f135eef686675c2876",
  measurementId: "G-Z0TNV9HTH3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export {
  db,
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  connectFirestoreEmulator,
  runTransaction,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter
};
