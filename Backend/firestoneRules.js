/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is accessing their own data
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Helper function to check if user is the author of a note
    function isAuthor() {
      return isAuthenticated() && resource.data.author == request.auth.token.email;
    }

    // Rules for user-specific settings
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      // Allow creation of user document during signup
      allow create: if isAuthenticated() && 
                   request.auth.uid == userId;
    }
    
    // Rules for notes
    match /notes/{noteId} {
      // Allow reading if user is authenticated and is the author
      allow read: if isAuthenticated() && 
                 (resource == null || resource.data.author == request.auth.token.email);
      
      // Allow creation if user is authenticated and sets themselves as author
      allow create: if isAuthenticated() && 
                   request.resource.data.author == request.auth.token.email;
      
      // Allow update if user is authenticated and is the author
      allow update: if isAuthenticated() && 
                   resource.data.author == request.auth.token.email &&
                   request.resource.data.author == request.auth.token.email;
      
      // Allow deletion if user is authenticated and is the author
      allow delete: if isAuthenticated() && 
                   resource.data.author == request.auth.token.email;
    }
    
    // If you have shared notes functionality
    match /shared_notes/{noteId} {
      allow read: if isAuthenticated() && 
                 (resource.data.sharedWith == request.auth.token.email ||
                  resource.data.author == request.auth.token.email);
      
      allow create: if isAuthenticated() && 
                   request.resource.data.author == request.auth.token.email;
      
      allow update: if isAuthenticated() && 
                   resource.data.author == request.auth.token.email;
      
      allow delete: if isAuthenticated() && 
                   resource.data.author == request.auth.token.email;
    }
  }
}
  */