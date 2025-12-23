// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDqM3RtWOynG72MBKueIReCu2S-ZQcLESo",
    authDomain: "tell-and-talk.firebaseapp.com",
    databaseURL: "https://tell-and-talk-default-rtdb.firebaseio.com",
    projectId: "tell-and-talk",
    storageBucket: "tell-and-talk.firebasestorage.app",
    messagingSenderId: "579539761154",
    appId: "1:579539761154:web:a8c7c2ad083cb0fb34cf1b"
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Check if user is logged in
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, set the name
        const display = user.displayName || localStorage.getItem("user_name");
        document.getElementById("user_name").innerText = "Welcome " + display;
    } else {
        // No user is signed in, redirect to index
        window.location = "index.html";
    }
});

function joinFreq() {
    const freq = document.getElementById("freq").value.trim();
    const pass = document.getElementById("freq_pass").value.trim();

    if (!/^\d{2,6}$/.test(freq) || pass === "") {
        alert("Please enter a valid Frequency number (2-6 digits) and a Password.");
        return;
    }

    const room = freq;
    const roomRef = firebase.database().ref(room);

    // READ the room data
    roomRef.once("value")
        .then(snap => {
            if (!snap.exists()) {
                // Room doesn't exist -> Create it
                // We use .update to avoid deleting existing children if there's a sync issue
                roomRef.update({
                    password: pass,
                    createdBy: localStorage.getItem("user_name") || "Anonymous"
                }).then(() => {
                    saveAndGo(freq, room, pass);
                });
            } else {
                // Room exists -> Check password
                const data = snap.val();
                if (data.password === pass) {
                    saveAndGo(freq, room, pass);
                } else {
                    alert("Wrong password for this Frequency!");
                }
            }
        })
        .catch(error => {
            // This catches permission errors
            console.error(error);
            alert("Error joining room: " + error.message + "\n(Check your Database Rules in Firebase Console!)");
        });
}

function saveAndGo(freq, room, pass) {
    localStorage.setItem("room_name", room);
    localStorage.setItem("freq_code", freq);
    localStorage.setItem("freq_pass", pass);
    window.location = "talkchat_page.html";
}

function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.clear();
        window.location = "index.html";
    }).catch((error) => {
        // Even if firebase fails, force the redirect
        console.error(error);
        localStorage.clear();
        window.location = "index.html";
    });
}