// fileStorage.js
import { storage } from './firebaseConfig';
import { encryptionUtils } from './encryption';

export const fileStorage = {
  async uploadFile(file, path) {
    try {
      const encryptionKey = sessionStorage.getItem('tempKey');
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Read the file as array buffer
      const buffer = await file.arrayBuffer();
      const fileData = new Uint8Array(buffer);
      
      // Encrypt the file data
      const encryptedData = encryptionUtils.encrypt(fileData, encryptionKey);
      
      // Create a new Blob with the encrypted data
      const encryptedBlob = new Blob([encryptedData], { type: 'application/encrypted' });
      
      // Upload to Firebase Storage
      const storageRef = storage.ref(path);
      const snapshot = await storageRef.put(encryptedBlob);
      
      return snapshot.ref.getDownloadURL();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },

  async downloadFile(url) {
    try {
      const encryptionKey = sessionStorage.getItem('tempKey');
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Download the encrypted file
      const response = await fetch(url);
      const encryptedData = await response.text();
      
      // Decrypt the file data
      const decryptedData = encryptionUtils.decrypt(encryptedData, encryptionKey);
      
      return decryptedData;
    } catch (error) {
      console.error('File download error:', error);
      throw error;
    }
  }
};