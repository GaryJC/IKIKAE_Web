// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDm5T4zDnFnOeqfFAgI5UxkieNkJYA9mE0",
    authDomain: "ikikae-web.firebaseapp.com",
    projectId: "ikikae-web",
    storageBucket: "ikikae-web.firebasestorage.app",
    messagingSenderId: "642510694791",
    appId: "1:642510694791:web:db588a8c896be0e287cb22",
    measurementId: "G-Q9ZD45DTTJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };