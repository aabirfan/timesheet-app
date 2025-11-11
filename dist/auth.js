import { auth } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export function bindAuthButtons(signInBtn, signOutBtn) {
  getRedirectResult(auth).catch(err => {
    console.error('[Auth] redirect error:', err.code, err.message);
    alert('Sign-in failed: ' + err.code);
  });

  signInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('[Auth] popup error:', err.code, err.message);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirErr) {
          console.error('[Auth] redirect fallback error:', redirErr.code, redirErr.message);
          alert('Sign-in failed: ' + redirErr.code);
        }
      } else if (err.code === 'auth/unauthorized-domain') {
        alert('This domain is not authorized in Firebase Authentication settings.\nAdd it under Authentication → Settings → Authorized domains.');
      } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
        alert('Sign-in requires HTTPS or localhost. Please deploy or use Firebase Hosting.');
      } else {
        alert('Sign-in failed: ' + err.code);
      }
    }
  });

  signOutBtn.addEventListener('click', () => signOut(auth));
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
