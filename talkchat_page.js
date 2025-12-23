const firebaseConfig = {
    apiKey: "AIzaSyDqM3RtWOynG72MBKueIReCu2S-ZQcLESo",
    authDomain: "tell-and-talk.firebaseapp.com",
    databaseURL: "https://tell-and-talk-default-rtdb.firebaseio.com",
    projectId: "tell-and-talk",
    storageBucket: "tell-and-talk.appspot.com",
    messagingSenderId: "579539761154",
    appId: "1:579539761154:web:a8c7c2ad083cb0fb34cf1b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const room_name = localStorage.getItem("room_name");
const user_name = localStorage.getItem("user_name") || "Guest";
const roomRef = firebase.database().ref(room_name + "/messages");
const onlineRef = firebase.database().ref(room_name + "/online");
const typingRef = firebase.database().ref(room_name + "/typing");
const IMGBB_API_KEY = "743eb5076af88b1bef88800d74fb602d";

let selectedFiles = [];

document.getElementById("room-display").innerText = "Freq: " + room_name;

firebase.auth().onAuthStateChanged((user) => {
    if (!user) location = "index.html";
    else {
        startPresence();
        startListening();
    }
});

function startPresence() {
    onlineRef.child(user_name).set(true);
    onlineRef.child(user_name).onDisconnect().remove();

    onlineRef.on("value", (snap) => {
        const users = snap.val() ? Object.keys(snap.val()) : [];
        document.getElementById("user-list").innerText = users.join(", ");
    });

    const input = document.getElementById("msg-input");
    input.addEventListener("input", () => {
        if (input.value.length > 0) {
            typingRef.child(user_name).set(true);
            typingRef.child(user_name).onDisconnect().remove();
        } else {
            typingRef.child(user_name).remove();
        }
    });

    typingRef.on("value", (snap) => {
        const typers = snap.val() ? Object.keys(snap.val()).filter(u => u !== user_name) : [];
        const label = document.getElementById("typing-indicator");
        label.innerText = typers.length > 0 ? typers.join(", ") + " is typing..." : "";
    });
}

function startListening() {
    roomRef.on("child_added", (snap) => renderMessage(snap.key, snap.val()));
    roomRef.on("child_changed", (snap) => {
        const data = snap.val();
        const row = document.getElementById(snap.key);
        if (row) {
            row.querySelector(".msg-content").innerHTML = getMsgContent(data, snap.key);
            row.querySelector(".like-count").innerText = data.like || 0;
            const statusIcon = row.querySelector(".status-icon");
            if(statusIcon) statusIcon.innerHTML = getStatusIcon(data.seenBy);
        }
    });
}

// MULTI-IMAGE PREVIEW
document.getElementById("file-input").addEventListener("change", function(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        selectedFiles = files;
        const container = document.getElementById("preview-container");
        container.innerHTML = "";
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.createElement("img");
                img.src = ev.target.result;
                img.className = "preview-thumb";
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
        document.getElementById("preview-text").innerText = files.length + " selected";
        document.getElementById("preview-bar").style.display = "flex";
    }
});

function cancelImage() {
    selectedFiles = [];
    document.getElementById("preview-bar").style.display = "none";
    document.getElementById("file-input").value = "";
}

// SEND LOGIC (Includes Multi-Upload & Seen Tracking)
async function handleSend() {
    const text = document.getElementById("msg-input").value.trim();
    if (!text && selectedFiles.length === 0) return;

    typingRef.child(user_name).remove();
    const sendBtn = document.getElementById("send-btn");

    if (selectedFiles.length > 0) {
        sendBtn.innerHTML = '<i class="fas fa-spinner spinner"></i>';
        for (let file of selectedFiles) {
            try {
                const reader = new FileReader();
                const base64 = await new Promise(r => {
                    reader.onload = e => r(e.target.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });
                const formData = new FormData();
                formData.append("image", base64);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
                const json = await res.json();
                
                roomRef.push({
                    name: user_name,
                    message: json.data.url,
                    type: "image",
                    time: firebase.database.ServerValue.TIMESTAMP,
                    like: 0,
                    seenBy: { [user_name]: true },
                    deleted: false
                });
            } catch (e) { console.error("Upload failed"); }
        }
        cancelImage();
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    } else if (text) {
        roomRef.push({
            name: user_name,
            message: text,
            type: "text",
            time: firebase.database.ServerValue.TIMESTAMP,
            like: 0,
            seenBy: { [user_name]: true },
            deleted: false
        });
    }
    document.getElementById("msg-input").value = "";
}

// SEEN SYSTEM
function markAsSeen(id, seenBy) {
    if (!seenBy || !seenBy[user_name]) {
        roomRef.child(id).child("seenBy").child(user_name).set(true);
    }
}

function getStatusIcon(seenBy) {
    if (!seenBy) return '<i class="fas fa-check"></i>';
    return Object.keys(seenBy).length > 1 
        ? '<i class="fas fa-check-double" style="color:var(--accent)"></i>' 
        : '<i class="fas fa-check"></i>';
}

// RENDERING
function renderMessage(id, data) {
    if (document.getElementById(id)) return;
    const isMine = data.name === user_name;
    const time = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const html = `
        <div class="msg-row ${isMine ? 'row-sent sent' : 'row-received received'}" id="${id}">
            <div class="user-label">${data.name}</div>
            <div class="bubble">
                <div class="msg-content">${getMsgContent(data, id)}</div>
                <div style="font-size:0.6rem; opacity:0.5; text-align:right; margin-top:5px; display:flex; justify-content:flex-end; align-items:center; gap:3px;">
                    ${time} ${isMine ? `<span class="status-icon">${getStatusIcon(data.seenBy)}</span>` : ''}
                </div>
            </div>
            <div class="msg-tools">
                <button class="tool-btn like-btn" onclick="likeMsg('${id}')">
                    <i class="fas fa-heart"></i> <span class="like-count">${data.like || 0}</span>
                </button>
                ${isMine && !data.deleted ? `
                    <button class="tool-btn" onclick="editMsg('${id}', '${data.message}')"><i class="fas fa-pen"></i></button>
                    <button class="tool-btn" onclick="deleteMsg('${id}')"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
            </div>
        </div>`;
    
    document.getElementById("output").insertAdjacentHTML('beforeend', html);
    document.getElementById("output").scrollTop = document.getElementById("output").scrollHeight;
    if (!isMine) markAsSeen(id, data.seenBy);
}

function getMsgContent(data, id) {
    if (data.deleted) return `<span style="opacity:0.6; font-style:italic;"><i class="fas fa-ban"></i> Message deleted</span>`;
    if (data.type === "image") return `<img src="${data.message}" style="width:100%; border-radius:10px; margin-top:5px;">`;

    const text = data.message;
    const limit = 300;
    if (text.length > limit) {
        return `
            <span id="short-${id}">${text.substring(0, limit)}</span>
            <span id="full-${id}" style="display:none;">${text}</span>
            <a class="read-more-btn" id="btn-${id}" onclick="toggleRead('${id}')">... Read More</a>
        `;
    }
    return text;
}

function toggleRead(id) {
    const f = document.getElementById("full-"+id);
    const s = document.getElementById("short-"+id);
    const b = document.getElementById("btn-"+id);
    const isHidden = f.style.display === "none";
    f.style.display = isHidden ? "inline" : "none";
    s.style.display = isHidden ? "none" : "inline";
    b.innerText = isHidden ? " Read Less" : "... Read More";
}

function likeMsg(id) { roomRef.child(id).child("like").transaction(c => (c || 0) + 1); }
function editMsg(id, old) {
    const n = prompt("Edit:", old);
    if (n && n !== old) roomRef.child(id).update({ message: n + " (edited)" });
}
function deleteMsg(id) {
    if (confirm("Delete?")) roomRef.child(id).update({ deleted: true, message: "Deleted", type: "text" });
}
function logout() { firebase.auth().signOut().then(() => { localStorage.clear(); location = "index.html"; }); }