import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const inventoryUI = document.getElementById('inventory-ui');
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('material-form');
const userGreeting = document.getElementById('user-greeting');
const submitBtn = document.getElementById('submit-btn');
const materialSelect = document.getElementById('mat-name');
const inventoryList = document.getElementById('inventory-list');
const thickSearch = document.getElementById('search-thickness');
const sizeSearch = document.getElementById('search-size');

let currentStock = [];

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => { if (confirm("Log out?")) signOut(auth); };

onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = 'none';
        // Check window size to decide between flex or block
        inventoryUI.style.display = window.innerWidth > 950 ? 'block' : 'block'; 
        // Style.css handles the inner flex, so we just show the card
        userGreeting.innerText = `Worker: ${user.displayName}`;
    } else {
        authContainer.style.display = 'block';
        inventoryUI.style.display = 'none';
    }
});

async function loadInventory(grade) {
    inventoryList.innerHTML = "<p class='footer-note'>Refreshing stock...</p>";
    thickSearch.value = ""; sizeSearch.value = "";
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=${grade}`);
        currentStock = await response.json();
        renderInventory(currentStock);
    } catch (err) { inventoryList.innerHTML = "<p class='footer-note'>Error.</p>"; }
}

function renderInventory(items) {
    inventoryList.innerHTML = "";
    if (items.length === 0) { inventoryList.innerHTML = "<p class='footer-note'>Empty.</p>"; return; }
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "stock-item";
        div.innerHTML = `
            <div>
                <strong>${item.thickness}" x ${item.size}</strong><br>
                <small>Cert: ${item.cert} | Loc: ${item.loc}</small><br>
                <small style="color:var(--text-muted)">Notes: ${item.other || "N/A"}</small><br>
                <small style="color:var(--brand-orange); font-weight:700;">ID: ${item.id}</small>
            </div>
            <button class="btn-use" onclick="window.useSheet('${item.id}')">USE</button>`;
        inventoryList.appendChild(div);
    });
}

const filterInventory = () => {
    const t = thickSearch.value.toLowerCase();
    const s = sizeSearch.value.toLowerCase();
    renderInventory(currentStock.filter(i => i.thickness.toLowerCase().includes(t) && i.size.toLowerCase().includes(s)));
};

thickSearch.oninput = filterInventory;
sizeSearch.oninput = filterInventory;
materialSelect.onchange = (e) => loadInventory(e.target.value);

window.useSheet = async (id) => {
    if (!confirm(`Remove ${id}?`)) return;
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "DELETE", id, item: materialSelect.value }) });
    loadInventory(materialSelect.value);
};

form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.innerText = "Syncing..."; submitBtn.disabled = true;
    const id = "SH-" + Math.random().toString(36).substr(2, 4).toUpperCase();
    const data = {
        action: "ADD", id, item: materialSelect.value,
        size: document.getElementById('sheet-size').value,
        thickness: document.getElementById('thickness').value,
        cert: document.getElementById('cert-num').value,
        loc: document.getElementById('location').value,
        other: document.getElementById('other-info').value || "N/A",
        user: auth.currentUser.email
    };
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    form.reset();
    loadInventory(data.item);
    submitBtn.innerText = "Add to Inventory"; submitBtn.disabled = false;
};