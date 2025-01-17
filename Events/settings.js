// Settings and account management
function openSettings() {
    settingsModal.style.display = 'block';
}

// Add these new functions:
function closeSettings() {
    settingsModal.style.display = 'none';
}

function saveSettings() {
    const bgColor = document.getElementById('bgColor').value;
    const fontColor = document.getElementById('fontColor').value;
    const fontStyle = document.getElementById('fontStyle').value;
    const textToSpeech = document.getElementById('textToSpeech').checked;

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = fontColor;
    document.body.style.fontFamily = fontStyle;
    document.getElementById('textToSpeechBtn').style.display = textToSpeech ? 'inline-block' : 'none';

    // Save settings to user's profile in Firebase
    db.collection('users').doc(currentUser.uid).set({
        settings: { bgColor, fontColor, fontStyle, textToSpeech }
    }, { merge: true })
        .then(() => {
            alert('Settings saved successfully');
            settingsModal.style.display = 'none';
        })
        .catch((error) => {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        });
}