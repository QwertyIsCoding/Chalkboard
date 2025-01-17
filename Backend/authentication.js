// Authentication functions
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';
            loadNotes();
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        });
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadNotes();
    } else {
        currentUser = null;
        showLoginModal();
    }
});

function showLoginModal() {
    loginModal.style.display = 'block';
}

function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';
            setupEncryption();
        })
        .catch((error) => {
            console.error('Signup error:', error);
            alert('Signup failed. Please try again.');
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            loginModal.style.display = 'block';
            clearNoteDisplay();
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}
