import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcxV21wY94f-t7v1SiboA-LqajhrdA2qQ",
  authDomain: "cropperiventorylsi.firebaseapp.com",
  projectId: "cropperiventorylsi",
  storageBucket: "cropperiventorylsi.firebasestorage.app",
  messagingSenderId: "998856931247",
  appId: "1:998856931247:web:30e00bea814a4fd731615a",
  measurementId: "G-PJB6W71DX7"
};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCN5wNS4lslN4CgL1FUy22_0SJB7yQsGAh12DzhJydYFC2kC9pA6cEgSFXn8SmoZdm/exec";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM elements
const loginBtn = document.getElementById('login-btn');
const inventoryUI = document.getElementById('inventory-ui');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('material-form');
const userGreeting = document.getElementById('user-greeting');
const submitBtn = document.getElementById('submit-btn');
const materialSelect = document.getElementById('mat-name');
const inventoryList = document.getElementById('inventory-list');

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

// Load stock from Google Sheets
async function loadInventory(grade) {
    inventoryList.innerHTML = "<p class='footer-note'>Loading inventory...</p>";
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=${grade}`);
        const stock = await response.json();
        
        // Calculate current stock levels by Unique ID
        const totals = {};
        const meta = {};
        stock.forEach(entry => {
            totals[entry.id] = (totals[entry.id] || 0) + Number(entry.qty);
            meta[entry.id] = { cert: entry.cert, size: entry.size };
        });

        inventoryList.innerHTML = "";
        let hasStock = false;

        Object.keys(totals).forEach(id => {
            if (totals[id] > 0) {
                hasStock = true;
                const div = document.createElement('div');
                div.className = "stock-item";
                div.innerHTML = `
                    <div>
                        <strong>${meta[id].size}</strong><br>
                        <small>Cert: ${meta[id].cert} | ID: ${id}</small>
                    </div>
                    <button class="btn-use" onclick="window.useSheet('${id}', '${meta[id].cert}', '${meta[id].size}')">USE</button>
                `;
                inventoryList.appendChild(div);
            }
        });

        if (!hasStock) inventoryList.innerHTML = "<p class='footer-note'>No items in stock.</p>";
    } catch (err) {
        inventoryList.innerHTML = "<p class='footer-note'>Error loading stock.</p>";
    }
}

// Global function for the USE button
window.useSheet = async (id, cert, size) => {
    if (!confirm(`Mark ${size} (ID: ${id}) as used?`)) return;
    
    const data = {
        item: materialSelect.value,
        cert: cert,
        size: size,
        qty: -1,
        id: id,
        user: auth.currentUser.email
    };

    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    alert("Sheet removed from inventory.");
    loadInventory(materialSelect.value);
};

materialSelect.onchange = (e) => loadInventory(e.target.value);

form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.innerText = "Syncing...";
    submitBtn.disabled = true;

    const randomId = "SH-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const data = {
        item: materialSelect.value,
        cert: document.getElementById('cert-num').value,
        size: document.getElementById('sheet-size').value,
        qty: document.getElementById('mat-qty').value,
        id: randomId,
        user: auth.currentUser.email
    };

    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    alert(`Success! Logged ID: ${randomId}`);
    form.reset();
    submitBtn.innerText = "Add New Sheet";
    submitBtn.disabled = false;
    loadInventory(data.item);
};