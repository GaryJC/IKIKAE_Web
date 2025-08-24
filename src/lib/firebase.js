"use client";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC5q8bjZCKkXWKXQRnqivkxUY147Qi5BH0",
    authDomain: "ikikae-web-aaf32.firebaseapp.com",
    projectId: "ikikae-web-aaf32",
    storageBucket: "ikikae-web-aaf32.firebasestorage.app",
    messagingSenderId: "304362126286",
    appId: "1:304362126286:web:f50b019aae23525322c99f",
    measurementId: "G-NXDME8VLGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };