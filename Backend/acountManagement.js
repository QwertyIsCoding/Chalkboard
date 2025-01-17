
function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

    // Delete user's notes
    db.collection('notes').where('author', '==', currentUser.email).get()
        .then((querySnapshot) => {
            const batch = db.batch();
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            // Delete user's account
            return currentUser.delete();
        })
        .then(() => {
            alert('Account deleted successfully');
            logout();
        })
        .catch((error) => {
            console.error('Error deleting account:', error);
            alert('Failed to delete account');
        });
}