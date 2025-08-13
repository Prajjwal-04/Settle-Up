// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config from the Firebase console
const firebaseConfig = {
    apiKey: "AIzaSyDm4sqJlrtt0ypmK3UHuC1KzVvZshUj7-0",
  authDomain: "settleup-2aea3.firebaseapp.com",
  projectId: "settleup-2aea3",
  storageBucket: "settleup-2aea3.firebasestorage.app",
  messagingSenderId: "160305386791",
  appId: "1:160305386791:web:f374333bc2e067d27c0502",
  measurementId: "G-MQRH785MVQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
