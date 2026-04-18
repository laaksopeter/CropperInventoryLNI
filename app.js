import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
provider.setCustomParameters({ prompt: 'select_account' });

const matSelect = document.getElementById('mat-name'); 
const structTypeSelect = document.getElementById('struct-type');
const modeSheet = document.getElementById('mode-sheet');
const modeTube = document.getElementById('mode-tube');
const inventoryList = document.getElementById('inventory-list');
const healthBadge = document.getElementById('health-badge');
const helpModal = document.getElementById('help-modal');

let currentMode = 'Sheet';
let currentStock = [];

const sheetGrades = ["A1008", "A1011", "A36", "5052", "5052 Filmed", "6061", "304 #4", "304 2B", "316", "Other"];
const tubeShapes = ["Square", "Rectangle", "Round", "Angle", "Channel", "Bar"];
const tubeMaterials = ["6061", "A513", "A500", "DOM", "4130", "Stainless", "Other"];

// HEALTH & MODAL LOGIC
async function checkSystemHealth() {
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=HEALTH_CHECK`);
        if (response.ok) { healthBadge.innerText = "System Active"; healthBadge.classList.remove('offline'); }
        else { throw new Error(); }
    } catch (err) { healthBadge.innerText = "System Offline"; healthBadge.classList.add('offline'); }
}
setInterval(checkSystemHealth, 20000);

document.getElementById('help-btn').onclick = () => helpModal.style.display = "block";
document.querySelector('.close-modal').onclick = () => helpModal.style.display = "none";
window.onclick = (e) => { if (e.target == helpModal) helpModal.style.display = "none"; };

function setMode(mode) {
    currentMode = mode;
    inventoryList.innerHTML = "<p class='footer-note'>Select a category above.</p>";
    if (mode === 'Sheet') {
        modeSheet.classList.add('active'); modeTube.classList.remove('active');
        document.getElementById('group-type').style.display = 'none';
        document.getElementById('label-grade').innerText = "Material Grade";
        document.getElementById('label-dim').innerText = "Thickness";
        updateSelect(matSelect, sheetGrades);
    } else {
        modeSheet.classList.remove('active'); modeTube.classList.add('active');
        document.getElementById('group-type').style.display = 'block';
        document.getElementById('label-grade').innerText = "Structural Shape";
        document.getElementById('label-dim').innerText = "Dimensions (OD x Wall)";
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
setMode('Sheet'); 

// AUTH
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => { if (confirm("Log out of session?")) signOut(auth); };

onAuthStateChanged(auth, (user) => {
    document.getElementById('auth-container').style.display = user ? 'none' : 'block';
    document.getElementById('inventory-ui').style.display = user ? '' : 'none';
    if(user) { document.getElementById('user-greeting').innerText = `Worker: ${user.displayName}`; checkSystemHealth(); }
});

// CSV IMPORT
const fileInput = document.getElementById('csv-file');
const importBtn = document.getElementById('import-btn');
importBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        const rows = event.target.result.split('\n').filter(r => r.trim() !== '');
        if (!confirm(`Import ${rows.length} rows to ${matSelect.value}?`)) return;
        importBtn.innerText = "Syncing Bulk...";
        for (let line of rows) {
            const c = line.split(',').map(v => v.trim());
            if (c.length < 5) continue;
            const id = (currentMode === 'Sheet' ? "SH-" : "ST-") + Math.random().toString(36).substr(2, 4).toUpperCase();
            const data = { action: "ADD", id, item: matSelect.value, size: c[0], thickness: c[1], cert: c[2], loc: c[3], other: c[4] || "N/A", other_type: currentMode === 'Structural' ? (c[5] || "Other") : matSelect.value, user: auth.currentUser.email };
            await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        }
        alert("Bulk Sync Complete."); importBtn.innerText = "Upload CSV File"; loadInventory(matSelect.value);
    };
    reader.readAsText(file);
};

// LOAD & RENDER
async function loadInventory(category) {
    inventoryList.innerHTML = "<p class='footer-note'>Querying system...</p>";
    try {
        const response = await fetch(`${SCRIPT_URL}?grade=${category}`);
        currentStock = await response.json();
        renderInventory(currentStock);
    } catch (err) { inventoryList.innerHTML = "<p class='footer-note'>Sync Error.</p>"; }
}

function renderInventory(items) {
    inventoryList.innerHTML = "";
    const s1 = document.getElementById('search-1').value.toLowerCase();
    const s2 = document.getElementById('search-2').value.toLowerCase();
    const s4 = document.getElementById('search-4').value.toLowerCase();

    const filtered = items.filter(i => 
        i.thickness.toLowerCase().includes(s1) && 
        i.size.toLowerCase().includes(s2) &&
        (i.cert || "").toLowerCase().includes(s4)
    );

    if (filtered.length === 0) { inventoryList.innerHTML = "<p class='footer-note'>No items found.</p>"; return; }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "stock-item";
        if (currentMode === 'Sheet') {
            div.innerHTML = `<div style="flex:1;"><div style="margin-bottom:4px;"><strong>${item.thickness}" THICK</strong> | <span>${item.size}</span></div><div style="font-size:0.75rem;"><b>Mat:</b> ${item.other_type} | <b>Cert:</b> ${item.cert}</div><div style="font-size:0.75rem; color:var(--text-muted);"><b>Loc:</b> ${item.loc} | <b>Notes:</b> ${item.other || "N/A"}</div><div style="font-size:0.7rem; color:var(--brand-orange); font-weight:700; font-family:monospace;">ID: ${item.id}</div></div><button class="btn-use" onclick="window.useSheet('${item.id}')">USE</button>`;
        } else {
            div.innerHTML = `<div style="width:100%"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><strong>${item.size}" LONG</strong><span style="background:var(--brand-black); color:white; padding:2px 8px; border-radius:3px; font-size:0.7rem;">${item.other_type}</span></div><div style="margin-bottom:8px;"><span style="color:var(--brand-orange); font-weight:800;">${item.thickness}</span></div><div style="border-top:1px solid var(--brand-grey-light); padding-top:8px; font-size:0.75rem;"><div><b>Cert:</b> ${item.cert} | <b>Loc:</b> ${item.loc}</div><div style="color:var(--text-muted);"><b>Notes:</b> ${item.other || "N/A"}</div><div style="font-weight:700; font-family:monospace;">ID: ${item.id}</div></div></div><button class="btn-use" style="margin-left:15px;" onclick="window.useSheet('${item.id}')">USE</button>`;
        }
        inventoryList.appendChild(div);
    });
}

['search-1', 'search-2', 'search-4'].forEach(id => {
    document.getElementById(id).oninput = () => renderInventory(currentStock);
});

matSelect.onchange = (e) => loadInventory(e.target.value);

window.useSheet = async (id) => {
    if (!confirm(`Mark ${id} as used?`)) return;
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "DELETE", id, item: matSelect.value }) });
    loadInventory(matSelect.value);
};

document.getElementById('material-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "Syncing..."; submitBtn.disabled = true;
    const id = (currentMode === 'Sheet' ? "SH-" : "ST-") + Math.random().toString(36).substr(2, 4).toUpperCase();
    const data = { action: "ADD", id, item: matSelect.value, thickness: document.getElementById('dim-input').value, size: document.getElementById('len-input').value, cert: document.getElementById('cert-num').value, loc: document.getElementById('location').value, other: document.getElementById('other-info').value || "N/A", other_type: currentMode === 'Structural' ? structTypeSelect.value : matSelect.value, user: auth.currentUser.email };
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    document.getElementById('material-form').reset();
    setMode(currentMode);
    loadInventory(data.item);
    submitBtn.innerText = "Add Entry"; submitBtn.disabled = false;
};

document.getElementById('bulk-import-btn').onclick = () => {
    document.getElementById('csv-file').click();
};

document.getElementById('csv-file').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        alert(`Selected CSV: ${file.name}`);
        // TODO: Implement CSV processing logic here
    }
};