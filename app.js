// Use CDN imports for GitHub Pages (No build tool needed)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your verified Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcxV21wY94f-t7v1SiboA-LqajhrdA2qQ",
  authDomain: "cropperiventorylsi.firebaseapp.com",
  projectId: "cropperiventorylsi",
  storageBucket: "cropperiventorylsi.firebasestorage.app",
  messagingSenderId: "998856931247",
  appId: "1:998856931247:web:30e00bea814a4fd731615a",
  measurementId: "G-PJB6W71DX7"
};

// !!! PASTE YOUR GOOGLE APPS SCRIPT URL HERE !!!
const SCRIPT_URL = "YOUR_DEPLOYED_WEB_APP_URL";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const inventoryUI = document.getElementById('inventory-ui');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('material-form');
const userGreeting = document.getElementById('user-greeting');

// 1. Logic to Login
loginBtn.onclick = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed! Check if Google Sign-in is enabled in Firebase Console.");
    }
};

// 2. Logic to Show/Hide UI based on Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = 'none';
        inventoryUI.style.display = 'block';
        userGreeting.innerText = `Worker: ${user.displayName}`;
    } else {
        authContainer.style.display = 'block';
        inventoryUI.style.display = 'none';
    }
});

// 3. Logic to Send Data to Google Sheet
form.onsubmit = async (e) => {
    e.preventDefault();
    
    const data = {
        item: document.getElementById('mat-name').value,
        qty: document.getElementById('mat-qty').value,
        user: auth.currentUser.email
    };

    try {
        // Send to Google Sheets
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(data)
        });

        alert("Inventory Updated in Sheet!");
        form.reset();
    } catch (err) {
        console.error("Sheet Error:", err);
        alert("Could not update Google Sheet.");
    }
};