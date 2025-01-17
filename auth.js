// auth.js
import { auth } from './firebaseConfig';
import { encryptionUtils } from './encryption';

export const userAuth = {
  async register(email, password, encryptionKey) {
    try {
      // Create user with email and password
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Store the encrypted key in a secure location (e.g., Firebase Realtime Database)
      // Note: Never store the actual encryption key, store a hash of it
      const keyHash = CryptoJS.SHA256(encryptionKey).toString();
      
      await firebase.database().ref(`users/${userCredential.user.uid}/keyHash`).set(keyHash);
      
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async login(email, password, encryptionKey) {
    try {
      // Sign in user
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      // Verify the encryption key
      const storedKeyHash = await firebase
        .database()
        .ref(`users/${userCredential.user.uid}/keyHash`)
        .once('value')
        .then(snapshot => snapshot.val());
      
      const providedKeyHash = CryptoJS.SHA256(encryptionKey).toString();
      
      if (storedKeyHash !== providedKeyHash) {
        throw new Error('Invalid encryption key');
      }
      
      // Store the encryption key in memory (never in localStorage)
      sessionStorage.setItem('tempKey', encryptionKey);
      
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
};