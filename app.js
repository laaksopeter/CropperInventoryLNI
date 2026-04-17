import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcxV21wY94f-t7v1SiboA-LqajhrdA2qQ",
  authDomain: "cropperiventorylsi.firebaseapp.com",
  projectId: "cropperiventorylsi",
  storageBucket: "cropperiventorylsi.firebasestorage.app",
  messagingSenderId: "998856931247",
  appId: "1:998856931247:web:30e00bea814a4fd731615a",
  measurementId: "G-PJB6W71DX7"
};

// Google Apps Script URL (Ensure this is your current /exec link)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCN5wNS4lslN4CgL1FUy22_0SJB7yQsGAh12DzhJydYFC2kC9pA6cEgSFXn8SmoZdm/exec";

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
const submitBtn = document.getElementById('submit-btn');
const materialSelect = document.getElementById('mat-name');
const inventoryList = document.getElementById('inventory-list');

// Dual Search Elements
const thickSearch = document.getElementById('search-thickness');
const sizeSearch = document.getElementById('search-size');

let currentStock = []; // Global variable to hold stock for filtering

// 1. Authentication Logic
loginBtn.onclick = () => signInWithPopup(auth, provider);

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

// 2. Fetch Inventory from Google Sheets
async function loadInventory(grade) {
    inventoryList.innerHTML = "<p class='footer-note'>Refreshing stock...</p>";
    thickSearch.value = ""; 
    sizeSearch.value = "";
    
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=${grade}`);
        currentStock = await response.json();
        renderInventory(currentStock);
    } catch (err) {
        inventoryList.innerHTML = "<p class='footer-note'>Error loading inventory.</p>";
    }
}

// 3. Render the list to the screen
function renderInventory(items) {
    inventoryList.innerHTML = "";
    if (items.length === 0) {
        inventoryList.innerHTML = "<p class='footer-note'>No matching sheets found.</p>";
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "stock-item";
        div.innerHTML = `
            <div>
                <strong>${item.thickness}" x ${item.size}</strong><br>
                <small>Cert: ${item.cert} | Loc: ${item.loc}</small><br>
                <small style="color:var(--primary)">ID: ${item.id}</small>
            </div>
            <button class="btn-use" onclick="window.useSheet('${item.id}')">USE</button>
        `;
        inventoryList.appendChild(div);
    });
}

// 4. Multi-Field Filter Logic
const filterInventory = () => {
    const thickTerm = thickSearch.value.toLowerCase();
    const sizeTerm = sizeSearch.value.toLowerCase();
    
    const filtered = currentStock.filter(item => {
        const matchesThick = item.thickness.toLowerCase().includes(thickTerm);
        const matchesSize = item.size.toLowerCase().includes(sizeTerm);
        return matchesThick && matchesSize;
    });
    
    renderInventory(filtered);
};

thickSearch.oninput = filterInventory;
sizeSearch.oninput = filterInventory;

// 5. "Use" Function (Deletes row from Sheet)
window.useSheet = async (id) => {
    const grade = materialSelect.value;
    if (!confirm(`Confirm removal of sheet ${id}?`)) return;

    try {
        // We use mode: 'no-cors' for Google Apps Script POSTs
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: "DELETE", id: id, item: grade })
        });
        alert("Sheet removed from stock.");
        loadInventory(grade); // Refresh the view
    } catch (err) {
        alert("Error removing sheet.");
    }
};

materialSelect.onchange = (e) => loadInventory(e.target.value);

// 6. Add Sheet Logic
form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.innerText = "Syncing...";
    submitBtn.disabled = true;

    // Generate Short Unique ID
    const id = "SH-" + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const data = {
        action: "ADD",
        id: id,
        item: materialSelect.value,
        size: document.getElementById('sheet-size').value,
        thickness: document.getElementById('thickness').value,
        cert: document.getElementById('cert-num').value,
        loc: document.getElementById('location').value,
        user: auth.currentUser.email
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        alert(`Success! ID: ${id} added.`);
        form.reset();
        loadInventory(data.item);
    } catch (err) {
        alert("Error adding sheet.");
    } finally {
        submitBtn.innerText = "Add to Inventory";
        submitBtn.disabled = false;
    }
};