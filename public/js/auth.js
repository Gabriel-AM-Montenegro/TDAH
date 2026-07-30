// =================================================================================
// AUTENTICACIÓN: onAuthStateChanged, login (Google/anónimo/email) y logout
// =================================================================================
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth, initialAuthToken } from './firebase.js';
import { cleanupListeners } from './listeners.js';
import { showTempMessage, showCustomConfirm, mostrarSeccion } from './ui.js';
import {
    CALENDAR_API_SCOPE,
    updateCalendarConnectionStatus,
    setCalendarAccessToken,
    restoreCalendarToken,
    resetCalendarState,
    loadCalendarEvents
} from './features/calendar.js';

let isLoggingOut = false;

// Recibe loadAllUserData como callback para evitar un import circular con main.js.
export function initAuthStateListener(onLogin) {
    if (!auth) return;

    onAuthStateChanged(auth, async (user) => {
        console.log('[Auth] onAuthStateChanged fired. user =', user);
        const userDisplayNameElement = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');
        const authButtonsWrapper = document.querySelector('.auth-buttons-wrapper');
        const emailAuthFormEl = document.getElementById('email-auth-form');
        const userIdDisplay = document.getElementById('user-id-display');
        const userInfoArea = document.getElementById('user-info-area');

        if (user) {
            if (userDisplayNameElement) {
                userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
            }
            if (userIdDisplay) userIdDisplay.textContent = `ID: ${user.uid}`;
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'none';
            if (emailAuthFormEl) {
                emailAuthFormEl.style.display = 'none';
                document.getElementById('email-auth-email').value = '';
                document.getElementById('email-auth-password').value = '';
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (userInfoArea) userInfoArea.classList.remove('auth-options-visible');

            // Recuperar token de Calendar (si existe)
            restoreCalendarToken();

            if (!isLoggingOut) {
                await onLogin(user.uid);
                // Después de cargar datos, ir a la vista HOY
                mostrarSeccion('hoy');
            }
            isLoggingOut = false;
        } else {
            // Resetear UI de usuario
            if (userDisplayNameElement) userDisplayNameElement.textContent = 'Por favor, inicia sesión:';
            if (userIdDisplay) userIdDisplay.textContent = '';
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfoArea) userInfoArea.classList.add('auth-options-visible');

            // Limpiar listeners y datos visibles
            cleanupListeners();
            const journalEntriesList = document.getElementById('journalEntriesList');
            const checkList = document.getElementById('checkList');
            const habitsList = document.getElementById('habitsList');
            const todayMitsList = document.getElementById('today-mits');
            if (journalEntriesList) journalEntriesList.innerHTML = '';
            if (checkList) checkList.innerHTML = '';
            if (habitsList) habitsList.innerHTML = '';
            if (todayMitsList) todayMitsList.innerHTML = '';

            // Resetear estado de Calendar
            resetCalendarState();

            if (!isLoggingOut) {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    }
                } catch (error) {
                    console.error("Error de inicio de sesión con token:", error);
                }
            }
            isLoggingOut = false;
        }
    });
}

export function wireAuthButtons() {
    if (!auth) return;

    // Login con Google (Firebase + Calendar)
    document.getElementById('google-signin-btn').onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            // AGREGAR SCOPE PARA CALENDAR
            provider.addScope(CALENDAR_API_SCOPE);

            console.log('[Auth] Iniciando signInWithPopup con scope de Calendar...');
            const result = await signInWithPopup(auth, provider);
            console.log('[Auth] signInWithPopup result =', result);

            // OBTENER EL TOKEN DE ACCESO PARA CALENDAR
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential && credential.accessToken) {
                setCalendarAccessToken(credential.accessToken);
                console.log('[Calendar] Token de acceso guardado.');
                updateCalendarConnectionStatus(true);
                // Cargar eventos inmediatamente
                loadCalendarEvents();
                showTempMessage('Conectado a Google Calendar.', 'success');
            } else {
                console.warn('[Calendar] No se pudo obtener el token de acceso.');
            }

        } catch (error) {
            console.error("Error de inicio de sesión con Google:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                console.log('[Auth] El popup se cerró antes de completar el login.');
                return;
            }
            showTempMessage(`Error con Google: ${error.message}`, 'error');
        }
    };

    // Login anónimo
    const anonymousBtn = document.getElementById('anonymous-signin-btn');
    if (anonymousBtn) {
        anonymousBtn.onclick = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Error de inicio de sesión anónimo:", error);
                showTempMessage(`Error de sesión anónima: ${error.message}`, 'error');
            }
        };
    }

    // Login con Email/Contraseña
    const emailToggleBtn = document.getElementById('email-signin-toggle-btn');
    const emailAuthForm = document.getElementById('email-auth-form');
    const emailAuthEmailInput = document.getElementById('email-auth-email');
    const emailAuthPasswordInput = document.getElementById('email-auth-password');
    const emailSigninBtn = document.getElementById('email-signin-btn');
    const emailRegisterBtn = document.getElementById('email-register-btn');
    const emailAuthCancelBtn = document.getElementById('email-auth-cancel-btn');

    const getEmailAuthErrorMessage = (error) => {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'El email ingresado no es válido.';
            case 'auth/email-already-in-use':
                return 'Ya existe una cuenta con ese email.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email o contraseña incorrectos.';
            default:
                return error.message;
        }
    };

    if (emailToggleBtn && emailAuthForm) {
        emailToggleBtn.onclick = () => {
            emailAuthForm.style.display = emailAuthForm.style.display === 'none' ? 'flex' : 'none';
        };
    }

    if (emailAuthCancelBtn && emailAuthForm) {
        emailAuthCancelBtn.onclick = () => {
            emailAuthForm.style.display = 'none';
            emailAuthEmailInput.value = '';
            emailAuthPasswordInput.value = '';
        };
    }

    if (emailSigninBtn) {
        emailSigninBtn.onclick = async () => {
            const email = emailAuthEmailInput.value.trim();
            const password = emailAuthPasswordInput.value;
            if (!email || !password) {
                showTempMessage('Completa email y contraseña.', 'warning');
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Error de inicio de sesión con email:", error);
                showTempMessage(getEmailAuthErrorMessage(error), 'error');
            }
        };
    }

    if (emailRegisterBtn) {
        emailRegisterBtn.onclick = async () => {
            const email = emailAuthEmailInput.value.trim();
            const password = emailAuthPasswordInput.value;
            if (!email || !password) {
                showTempMessage('Completa email y contraseña.', 'warning');
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                showTempMessage('Cuenta creada exitosamente.', 'success');
            } catch (error) {
                console.error("Error de registro con email:", error);
                showTempMessage(getEmailAuthErrorMessage(error), 'error');
            }
        };
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (await showCustomConfirm("¿Cerrar sesión?")) {
                isLoggingOut = true;
                await signOut(auth);
            }
        };
    }
}
