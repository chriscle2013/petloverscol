import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: 'select_account'
});

async function ensureUserProfile(user, displayName = '') {
    try {
        const ref = doc(db, 'users', user.uid);

        // Solo inicializamos el doc si NO existe.
        // Esto evita que en cada login se pisen phone/address/city/state.
        const snap = await (await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')).getDoc(ref);

        if (snap.exists()) {
            // Asegurar que email/displayName/photoURL existan, sin tocar dirección/ciudad.
            await setDoc(ref, {
                email: user.email || '',
                displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Usuario',
                photoURL: user.photoURL || ''
            }, { merge: true });
            return;
        }

        // Crear doc inicial
        await setDoc(ref, {
            email: user.email || '',
            displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Usuario',
            photoURL: user.photoURL || '',
            createdAt: new Date(),
            phone: '',
            address: '',
            city: '',
            state: ''
        }, { merge: true });
    } catch (error) {
        console.error('Error guardando perfil de usuario:', error);
    }
}

/**
 * REGISTRO DE USUARIO
 */
export async function registerUser(email, password, displayName) {
    try {
        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Actualizar perfil con nombre
        await updateProfile(user, {
            displayName: displayName
        });

        // Guardar datos del usuario en Firestore
        await ensureUserProfile(user, displayName);

        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * LOGIN DE USUARIO
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(userCredential.user);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * LOGIN CON GOOGLE
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
        return { success: true, user: result.user };
    } catch (error) {
        if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
            try {
                await signInWithRedirect(auth, googleProvider);
                return { success: true, pendingRedirect: true };
            } catch (redirectError) {
                return { success: false, error: redirectError.message };
            }
        }
        return { success: false, error: error.message };
    }
}

export async function handleGoogleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
            await ensureUserProfile(result.user);
            return { success: true, user: result.user };
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * RECUPERAR CONTRASEÑA
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * LOGOUT DE USUARIO
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * OBTENER USUARIO ACTUAL
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * ESCUCHAR CAMBIOS DE AUTENTICACIÓN
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * VERIFICAR SI USUARIO ESTÁ AUTENTICADO
 */
export function isUserAuthenticated() {
    return auth.currentUser !== null;
}

export { auth, db };
