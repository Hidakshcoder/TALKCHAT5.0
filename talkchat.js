// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDqM3RtWOynG72MBKueIReCu2S-ZQcLESo",
    authDomain: "tell-and-talk.firebaseapp.com",
    databaseURL: "https://tell-and-talk-default-rtdb.firebaseio.com",
    projectId: "tell-and-talk",
    storageBucket: "tell-and-talk.appspot.com", // ✅ FIXED
    messagingSenderId: "579539761154",
    appId: "1:579539761154:web:a8c7c2ad083cb0fb34cf1b"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}


// UI TOGGLE FUNCTIONS
function showSignup() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("forgot-section").style.display = "none";
    document.getElementById("signup-section").style.display = "block";
}

function showLogin() {
    document.getElementById("signup-section").style.display = "none";
    document.getElementById("forgot-section").style.display = "none";
    document.getElementById("login-section").style.display = "block";
}

function showForgot() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("signup-section").style.display = "none";
    document.getElementById("forgot-section").style.display = "block";
}

// --- GOOGLE LOGIN ---
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
        const user = result.user;
        // Save to local storage for the other pages to use
        localStorage.setItem("user_name", user.displayName);
        localStorage.setItem("user_email", user.email);
        window.location = "talkchat_room.html";
    }).catch((error) => {
        alert(error.message);
    });
}

// --- EMAIL SIGN UP (REGISTER) ---
function emailSignup() {
    const name = document.getElementById("signup_name").value.trim();
    const email = document.getElementById("signup_email").value.trim();
    const pass = document.getElementById("signup_password").value.trim();

    if (name === "" || email === "" || pass === "") {
        alert("Please fill all fields");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Update display name
            user.updateProfile({
                displayName: name
            }).then(() => {
                // Send Verification Email
                user.sendEmailVerification().then(() => {
                    alert("Registration Successful! A verification email has been sent to " + email + ". Please verify before logging in.");
                    firebase.auth().signOut(); // Sign out until verified
                    showLogin();
                });
            });
        })
        .catch((error) => {
            alert(error.message);
        });
}

// --- EMAIL LOGIN ---
function emailLogin() {
    const email = document.getElementById("login_email").value.trim();
    const pass = document.getElementById("login_password").value.trim();

    if (email === "" || pass === "") {
        alert("Please enter email and password");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            const user = userCredential.user;

            // CHECK VERIFICATION
            if (user.emailVerified) {
                // Success
                localStorage.setItem("user_name", user.displayName || email.split('@')[0]);
                localStorage.setItem("user_email", user.email);
                window.location = "talkchat_room.html";
            } else {
                alert("Please verify your email address first. Check your inbox.");
                firebase.auth().signOut();
            }
        })
        .catch((error) => {
            alert("Login Failed: " + error.message);
        });
}

// --- FORGOT PASSWORD ---
function resetPassword() {
    const email = document.getElementById("reset_email").value.trim();
    
    if (email === "") {
        alert("Please enter your registered email address.");
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
            showLogin();
        })
        .catch((error) => {
            alert(error.message);
        });

}
