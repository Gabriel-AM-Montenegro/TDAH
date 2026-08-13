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
    signInWithEmailAndPassword,
    getAdditionalUserInfo
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth, initialAuthToken, trackEvent } from './firebase.js';
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
import { resetTodayAgenda } from './features/today-agenda.js';
import { restoreOutlookAccount, resetOutlookState } from './features/outlook-calendar.js';

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
        const userInfoArea = document.getElementById('user-info-area');

        if (user) {
            if (userDisplayNameElement) {
                userDisplayNameElement.textContent = `Bienvenido, ${user.displayName || user.email || user.uid.substring(0, 8)}!`;
            }
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
            restoreOutlookAccount();

            if (!isLoggingOut) {
                await onLogin(user.uid);
                // Después de cargar datos, ir a la vista HOY
                mostrarSeccion('hoy');
            }
            isLoggingOut = false;
        } else {
            // Resetear UI de usuario
            if (userDisplayNameElement) userDisplayNameElement.textContent = 'Por favor, inicia sesión:';
            if (authButtonsWrapper) authButtonsWrapper.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfoArea) userInfoArea.classList.add('auth-options-visible');

            // Limpiar listeners y datos visibles
            cleanupListeners();
            const journalEntriesList = document.getElementById('journalEntriesList');
            const checkList = document.getElementById('checkList');
            const habitsList = document.getElementById('habitsList');
            const todayMitsList = document.getElementById('today-mits');
            const todayNextStep = document.getElementById('today-next-step');
            const pointsDisplay = document.getElementById('points-display');
            if (journalEntriesList) journalEntriesList.innerHTML = '';
            if (checkList) checkList.innerHTML = '';
            if (habitsList) habitsList.innerHTML = '';
            if (todayMitsList) todayMitsList.innerHTML = '';
            if (todayNextStep) todayNextStep.innerHTML = '';
            if (pointsDisplay) pointsDisplay.textContent = '';

            // Resetear estado de Calendar y Outlook
            resetCalendarState();
            resetOutlookState();
            // Limpia también las tarjetas de Trello del merge (lo de arriba
            // solo limpia Calendar/Outlook; si no, quedan visibles tras salir).
            resetTodayAgenda();

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

    // Login con Google (Firebase + Calendar) vía popup. Se probó
    // signInWithRedirect el 2026-08-11 pensando que sería más compatible con
    // el modo standalone de iOS, pero resultó peor: se rompió incluso en
    // Safari normal (las protecciones de rastreo entre sitios de Safari
    // cortan la cadena de redirects que usa Firebase para este flujo). El
    // popup es lo que realmente funciona en Safari — sigue fallando en el
    // modo standalone de iOS (ver CLAUDE.md), pero eso ya era así de antes.
    document.getElementById('google-signin-btn').onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            // AGREGAR SCOPE PARA CALENDAR
            provider.addScope(CALENDAR_API_SCOPE);

            const result = await signInWithPopup(auth, provider);
            trackEvent(getAdditionalUserInfo(result)?.isNewUser ? 'sign_up' : 'login', { method: 'google' });

            // OBTENER EL TOKEN DE ACCESO PARA CALENDAR
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential && credential.accessToken) {
                setCalendarAccessToken(credential.accessToken);
                updateCalendarConnectionStatus(true);
                loadCalendarEvents();
                showTempMessage('Conectado a Google Calendar.', 'success');
            }
        } catch (error) {
            console.error("Error de inicio de sesión con Google:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                return;
            }
            showTempMessage('No se pudo conectar con Google. Probá de nuevo.', 'error');
        }
    };

    // Login anónimo
    const anonymousBtn = document.getElementById('anonymous-signin-btn');
    if (anonymousBtn) {
        anonymousBtn.onclick = async () => {
            try {
                const result = await signInAnonymously(auth);
                trackEvent(getAdditionalUserInfo(result)?.isNewUser ? 'sign_up' : 'login', { method: 'anonymous' });
            } catch (error) {
                console.error("Error de inicio de sesión anónimo:", error);
                showTempMessage('No se pudo iniciar sesión. Probá de nuevo.', 'error');
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
                console.error("Auth: Error de email/contraseña no traducido:", error);
                return 'No se pudo completar la acción. Probá de nuevo.';
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
                trackEvent('login', { method: 'email' });
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
                trackEvent('sign_up', { method: 'email' });
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
