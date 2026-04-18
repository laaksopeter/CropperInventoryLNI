import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcxV21wY94f-t7v1SiboA-LqajhrdA2qQ",
  authDomain: "cropperiventorylsi.firebaseapp.com",
  projectId: "cropperiventorylsi",
  storageBucket: "cropperiventorylsi.firebasestorage.app",
  messagingSenderId: "998856931247",
  appId: "1:998856931247:web:30e00bea814a4fd731615a"
};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCN5wNS4lslN4CgL1FUy22_0SJB7yQsGAh12DzhJydYFC2kC9pA6cEgSFXn8SmoZdm/exec";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const matSelect = document.getElementById('mat-name'); 
const structTypeSelect = document.getElementById('struct-type');
const modeSheet = document.getElementById('mode-sheet');
const modeTube = document.getElementById('mode-tube');
const inventoryList = document.getElementById('inventory-list');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

let currentMode = 'Sheet';
let currentStock = [];

// Data Definitions
const sheetGrades = ["A1008", "A1011", "A36", "5052", "5052 Filmed", "6061", "304 #4", "304 2B", "316", "Other"];
const tubeShapes = ["Square", "Rectangle", "Round", "Angle", "Channel", "Bar"];
const tubeMaterials = ["6061", "A513", "A500", "DOM", "4130", "Stainless", "Other"];

/**
 * UI & Mode Logic
 */
function setMode(mode) {
    currentMode = mode;
    inventoryList.innerHTML = "<p class='footer-note'>Select a category above.</p>";
    currentStock = [];

    if (mode === 'Sheet') {
        modeSheet.classList.add('active'); 
        modeTube.classList.remove('active');
        document.getElementById('group-type').style.display = 'none';
        document.getElementById('label-grade').innerText = "Material Grade";
        document.getElementById('label-dim').innerText = "Thickness";
        document.getElementById('label-len').innerText = "Size (W x L in Inches)";
        document.getElementById('search-3').placeholder = "Filt. Material";
        updateSelect(matSelect, sheetGrades);
    } else {
        modeSheet.classList.remove('active'); 
        modeTube.classList.add('active');
        document.getElementById('group-type').style.display = 'block';
        document.getElementById('label-grade').innerText = "Structural Shape";
        document.getElementById('label-dim').innerText = "Dimensions (OD x Wall or Height x Width)";
        document.getElementById('label-len').innerText = "Length (Remnant in Inches)";
        document.getElementById('search-3').placeholder = "Filt. Material";
        updateSelect(matSelect, tubeShapes);
        updateSelect(structTypeSelect, tubeMaterials);
    }
}

function updateSelect(element, options) {
    element.innerHTML = '<option value="" disabled selected>Select...</option>';
    options.forEach(opt => {
        let el = document.createElement('option');
        el.value = opt; el.textContent = opt;
        element.appendChild(el);
    });
}

modeSheet.onclick = () => setMode('Sheet');
modeTube.onclick = () => setMode('Structural');

// Initial Setup
setMode('Sheet'); 

/**
 * Authentication
 */
loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => { if (confirm("Log out of LNI Terminal?")) signOut(auth); };

onAuthStateChanged(auth, (user) => {
    document.getElementById('auth-container').style.display = user ? 'none' : 'block';
    document.getElementById('inventory-ui').style.display = user ? 'flex' : 'none';
    if(user) document.getElementById('user-greeting').innerText = `Worker: ${user.displayName}`;
});

/**
 * Inventory Actions
 */
async function loadInventory(category) {
    inventoryList.innerHTML = "<p class='footer-note'>Querying system data...</p>";
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=${category}`);
        currentStock = await response.json();
        renderInventory(currentStock);
    } catch (err) { 
        inventoryList.innerHTML = "<p class='footer-note'>Sync Error. Check network.</p>"; 
    }
}

function renderInventory(items) {
    inventoryList.innerHTML = "";
    const s1 = document.getElementById('search-1').value.toLowerCase();
    const s2 = document.getElementById('search-2').value.toLowerCase();
    const s3 = document.getElementById('search-3').value.toLowerCase();

    const filtered = items.filter(i => 
        i.thickness.toLowerCase().includes(s1) && 
        i.size.toLowerCase().includes(s2) &&
        (i.other_type || "").toLowerCase().includes(s3)
    );

    if (filtered.length === 0) { 
        inventoryList.innerHTML = "<p class='footer-note'>No items found.</p>"; 
        return; 
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "stock-item";
        
        if (currentMode === 'Sheet') {
            div.innerHTML = `
                <div>
                    <strong>${item.thickness}" THICK</strong> | <span>${item.size}</span><br>
                    <small>Material: <b>${item.other_type}</b> | Cert: ${item.cert}</small><br>
                    <small>Loc: ${item.loc} | Notes: ${item.other || "N/A"}</small><br>
                    <small style="color:var(--brand-orange); font-weight:700;">ID: ${item.id}</small>
                </div>
                <button class="btn-use" onclick="window.useSheet('${item.id}')">USE</button>`;
        } else {
            div.innerHTML = `
                <div style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <strong style="font-size: 1.1rem;">${item.size}" LONG</strong>
                        <span style="background: var(--brand-black); color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; font-weight: 700;">${item.other_type}</span>
                    </div>
                    <div><span style="color: var(--brand-orange); font-weight: 800;">${item.thickness}</span> <small>(OD x Wall)</small></div>
                    <div style="border-top: 1px solid var(--brand-grey-light); margin-top: 8px; padding-top: 8px;">
                        <small>Cert: ${item.cert} | Loc: ${item.loc}</small><br>
                        <small>Notes: ${item.other || "N/A"}</small><br>
                        <small style="color:var(--brand-black); font-weight:700;">ID: ${item.id}</small>
                    </div>
                </div>
                <button class="btn-use" style="margin-left: 15px;" onclick="window.useSheet('${item.id}')">USE</button>`;
        }
        inventoryList.appendChild(div);
    });
}

// Global search inputs
['search-1', 'search-2', 'search-3'].forEach(id => {
    document.getElementById(id).oninput = () => renderInventory(currentStock);
});

matSelect.onchange = (e) => loadInventory(e.target.value);

window.useSheet = async (id) => {
    if (!confirm(`Mark ${id} as used?`)) return;
    await fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ action: "DELETE", id, item: matSelect.value }) 
    });
    loadInventory(matSelect.value);
};

/**
 * Form Submission
 */
document.getElementById('material-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "Syncing..."; 
    submitBtn.disabled = true;
    
    // ID prefix based on mode
    const id = (currentMode === 'Sheet' ? "SH-" : "ST-") + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const data = {
        action: "ADD", 
        id, 
        item: matSelect.value, // Spreadsheet Tab Name
        thickness: document.getElementById('dim-input').value,
        size: document.getElementById('len-input').value,
        cert: document.getElementById('cert-num').value,
        loc: document.getElementById('location').value,
        other: document.getElementById('other-info').value || "N/A",
        // Logic fix: Sheets log Grade in Column H, Structural logs Material Type in Column H
        other_type: currentMode === 'Structural' ? structTypeSelect.value : matSelect.value,
        user: auth.currentUser.email
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        document.getElementById('material-form').reset();
        setMode(currentMode); // Reset view labels
        loadInventory(data.item);
    } catch (err) {
        alert("Error syncing to spreadsheet.");
    } finally {
        submitBtn.innerText = "Add Entry"; 
        submitBtn.disabled = false;
    }
};