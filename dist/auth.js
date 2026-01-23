import { auth } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
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
        alert(
          'This domain is not authorized for Google sign-in.\n\n' +
          'To use PRODUCTION Google sign-in locally: Firebase Console → Authentication → Settings → Authorized domains → add 127.0.0.1 (and localhost).\n\n' +
          'If you are using the Auth emulator, use a non-OAuth sign-in method (anonymous or email/password).'
        );
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
