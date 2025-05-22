import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  OAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence  
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "xxx",
  projectId: "ainee-f6194",
  storageBucket: "xxx",
  messagingSenderId: "xxx",
  appId: "xxx",
  measurementId: "xxx"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let analytics = null;

// Only initialize analytics on the client side
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const auth = getAuth(app);
// Enable session persistence
auth.setPersistence(browserLocalPersistence);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Add scopes and customize providers
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = async () => {
  try {
    // Clear any previous auth state that might cause issues
    await auth.signOut();
    
    // Add a slight delay to ensure any previous popup is fully closed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    
    // Return a structured error object
    if (error.code === 'auth/popup-closed-by-user') {
      return { cancelled: true, code: error.code };
    }
    
    if (error.code === 'auth/cancelled-popup-request') {
      return { cancelled: true, code: error.code };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { blocked: true, code: error.code };
    }
    
    throw error;
  }
};

export const signInWithApple = async () => {
  try {
    // Clear any previous auth state that might cause issues
    await auth.signOut();
    
    // Add a slight delay to ensure any previous popup is fully closed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await signInWithPopup(auth, appleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Apple", error);
    
    // Return a structured error object
    if (error.code === 'auth/popup-closed-by-user') {
      return { cancelled: true, code: error.code };
    }
    
    if (error.code === 'auth/cancelled-popup-request') {
      return { cancelled: true, code: error.code };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { blocked: true, code: error.code };
    }
    
    throw error;
  }
}; 