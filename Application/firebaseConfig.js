// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC2rV2E0BujE6b17pKbfGbN7jUPcKWMGak",
  authDomain: "chalkboard-2d89c.firebaseapp.com",
  projectId: "chalkboard-2d89c",
  storageBucket: "chalkboard-2d89c.firebasestorage.app",
  messagingSenderId: "416242146566",
  appId: "1:416242146566:web:739d2ad2c3f4d8104a5287",
  measurementId: "G-4EGX29H7WY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);