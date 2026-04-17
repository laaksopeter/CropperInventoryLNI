import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { /* Paste from Firebase Console */ };
const SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL";

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// UI Elements
const loginBtn = document.getElementById('login-btn');
const inventoryUI = document.getElementById('inventory-ui');
const form = document.getElementById('material-form');

loginBtn.onclick = () => signInWithPopup(auth, provider);

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        inventoryUI.style.display = 'block';
        document.getElementById('user-greeting').innerText = `Clocked in: ${user.displayName}`;
    }
});

form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        item: document.getElementById('mat-name').value,
        qty: document.getElementById('mat-qty').value,
        user: auth.currentUser.email
    };

    // Send to Google Sheets via Apps Script
    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Critical for Apps Script
        body: JSON.stringify(data)
    });

    alert("Logged to Sheet!");
    form.reset();
};