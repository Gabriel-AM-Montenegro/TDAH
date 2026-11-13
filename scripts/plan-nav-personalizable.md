# Plan — Nav personalizable ("Mi menú")

## Contexto

Pedido del usuario: la pantalla de inicio muestra 3 grupos plegados (Organizar / Reflexionar / Aprender) y al abrir uno aparecen muchos botones. Cada persona usa cosas distintas (ej. Checklist + Garage de Ideas + Técnicas, o Blog + Respiración + Checklist + Calendario) y hoy no hay forma de acomodar el menú a su uso.

**Idea**: cada usuario elige hasta 6 secciones "favoritas" que aparecen sueltas, siempre visibles, junto a Hoy. El resto sigue en los grupos plegados como ahora. Sin favoritos elegidos, la app se ve **exactamente igual que hoy** (cero regresión para quien no toque nada).

Leer `CLAUDE.md` antes de empezar (estado actual de la app y convenciones).

## Decisiones de diseño (y por qué)

- **Se elige desde Configuración, no con estrellitas ni arrastrando en el menú.** Una lista de checkboxes es descubrible, accesible por teclado y no depende de gestos escondidos (long-press, drag). Para este público, descubrir sin adivinar pesa más que lo "elegante".
- **Tope de 6 favoritos.** Sin tope, el menú vuelve al mismo problema de amontonamiento. Al llegar a 6, los checkboxes restantes se deshabilitan y se muestra un mensaje corto (`showTempMessage`/texto de ayuda).
- **`Hoy` y `Configuración` no se eligen**: ya están siempre visibles y sueltos.
- **v1 sin reordenar.** Los favoritos aparecen en el orden canónico del menú (el mismo de hoy). Reordenar (flechas ↑↓ en la lista de Configuración) queda como v2 solo si hace falta; arrastrar y soltar queda descartado por costo y accesibilidad.
- **Se MUEVEN los `<button>` existentes entre contenedores, no se clonan.** Así conservan su `id` (`btn-<sección>`) y el listener de click que `main.js` ya les puso al arrancar (`document.querySelectorAll('.nav-tabs button')`), y `mostrarSeccion()` (`ui.js`) sigue marcando `.active` sin tocarlo.

## Datos

Campo nuevo en el doc que ya existe: `artifacts/{publicDataDocId}/users/{userId}/settings/appSettings`

```js
navFavorites: ['checklist', 'garage-ideas', 'tecnicas']   // array de IDs de sección, máx 6
```

IDs válidos (los mismos de `SECTION_TITLES` en `ui.js`, sin `hoy` ni `config`): `pomodoro`, `checklist`, `garage-ideas`, `habitos`, `tareas`, `calendario`, `journal`, `respiracion`, `tecnicas`, `notas`, `nutricion`.

Mismo patrón que `theme.js`: `setDoc(userSettingsRef, { navFavorites }, { merge: true })` + `onSnapshot` del mismo doc + copia en `localStorage` (clave `navFavorites`, JSON) para aplicarlo sin parpadeo al abrir.

## ⚠️ `firestore.rules` (obligatorio, es el error más probable)

Desde la auditoría del 2026-09-16 el proyecto es **fail-closed**: `isValidAppSettings` usa `hasOnly([...])`, así que guardar `navFavorites` va a fallar con "permission denied" si no se suma. Cambios en la función existente:

```js
function isValidAppSettings(data) {
  return data.keys().hasOnly(['theme', 'textSize', 'tourCompleted', 'timezone', 'navFavorites'])
    && /* ...los checks actuales sin cambios... */
    && (!('navFavorites' in data) || (data.navFavorites is list && data.navFavorites.size() <= 6));
}
```

Limitación conocida (igual que `subtasks` en checklist): las reglas no pueden validar el contenido de cada elemento de la lista; el tope de 6 y el límite de 1MB por documento acotan el abuso. El cliente ignora IDs que no existan en el DOM.

Probar las reglas contra el emulador antes de deployar (patrón ya usado: `@firebase/rules-unit-testing` en el scratchpad). Casos mínimos: lista de 3 válida OK, lista de 7 rechazada, `navFavorites: 'checklist'` (no lista) rechazado, escritura vieja `{theme:'dark'}` sigue OK.

## UI

**Nav (`public/index.html`)**: un contenedor nuevo entre el botón Hoy y los `<details>`:

```html
<div id="nav-favorites" class="nav-favorites" hidden></div>
```

**Configuración (`public/index.html`)**: bloque nuevo (después de "Tamaño de texto", mismo estilo `config-step`):

```html
<h3>Mi menú</h3>
<div class="config-step">
  <p class="help-text">Elegí hasta 6 secciones para tenerlas siempre a mano, sin abrir los grupos.</p>
  <div id="nav-favorites-options" class="nav-favorites-options"></div>
</div>
```

La lista se arma por JS (un `<label><input type="checkbox"> emoji + nombre</label>` por sección, con el nombre tomado del texto del propio botón del nav para no duplicar etiquetas).

**Comportamiento (`public/js/features/nav-favorites.js`, nuevo)**:
1. Al primer uso, recorrer los botones de sección una vez y guardar su "casa" (contenedor + posición dentro del grupo).
2. `applyNavFavorites(ids)`: primero devolver TODOS los botones a su casa en orden canónico, después mover los favoritos a `#nav-favorites` (en orden canónico). Mostrar/ocultar `#nav-favorites` según haya favoritos. Ocultar el `<details>` de un grupo si se quedó sin botones.
3. Sincronizar los checkboxes de Configuración con el estado.
4. Exporta `applyNavFavoritesFromCache()` (síncrono, desde `localStorage`) e `initNavFavorites(db, userId)` (listener de Firestore, `registerListener`, guarda al tildar/destildar).
5. Al cerrar sesión / cambiar de usuario, volver al menú por defecto (misma limpieza que hacen otros módulos en `auth.js`).

**CSS (`styles1.css`)**: `.nav-favorites { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); justify-content: center; }` y **`.nav-favorites[hidden] { display: none; }`** (mismo bug que ya apareció con `#ideas-done-list`: un `display` fijado por CSS pisa el atributo `hidden`). Los botones dentro heredan `.nav-tabs button`, no hace falta estilo nuevo. Ocultar un `<details>` vacío con `hidden` también necesita su regla `[hidden]` si `.nav-group` llegara a tener `display`.

## Archivos a tocar

- **Nuevo**: `public/js/features/nav-favorites.js`
- `public/index.html`: `#nav-favorites` en el nav + bloque "Mi menú" en Configuración
- `public/js/main.js`: `applyNavFavoritesFromCache()` en el `DOMContentLoaded` (antes de que resuelva el login, para evitar parpadeo) e `initNavFavorites(db, currentUserId)` en `loadAllUserData`
- `public/css/styles1.css`: reglas de arriba
- `firestore.rules`: `navFavorites` en `isValidAppSettings` (ver arriba)
- Después: `CLAUDE.md` y el `.docx` técnico/funcional (módulo "Configuración" y modelo de datos `settings/appSettings`)

## Criterios de aceptación

- Sin favoritos: el menú es idéntico al actual (Hoy, 3 grupos, Configuración).
- Tildar una sección en Configuración la hace aparecer suelta junto a Hoy al instante y la saca de su grupo; destildar la devuelve a su lugar original, en su orden original.
- Al llegar a 6 favoritos no se puede tildar un séptimo (checkboxes deshabilitados + mensaje).
- Un grupo cuyos botones son todos favoritos desaparece; si se destilda alguno, vuelve.
- Click en un favorito navega y marca `.active` igual que antes; el título de la pestaña cambia (viene de `mostrarSeccion`).
- Recargar la página o abrirla en otro dispositivo mantiene los favoritos (Firestore) y no hay parpadeo del menú por defecto (cache en `localStorage`).
- Cerrar sesión y entrar con otra cuenta no hereda los favoritos de la anterior.
- Sin "permission denied" al guardar (probar específicamente en el emulador con las reglas nuevas).
- Funciona en 375px de ancho y con "Aa Grande" activo sin desbordar horizontalmente; checkboxes operables con teclado.

## Fuera de alcance (v1)

Reordenar favoritos, renombrar secciones, esconder secciones por completo, sincronizar el orden de los grupos.

## Notas de testing (aprendidas en esta sesión)

- Levantar el emulador con `firebase emulators:start` y la app con `?emulator=1`; si los puertos 8080/9099 dan "refused", suele quedar un `java.exe` viejo: matarlo y reiniciar.
- Los nav-groups se cierran solos después de navegar (`mostrarSeccion`); para probar un botón dentro de un grupo hay que reabrir el grupo primero. Los favoritos, al estar afuera, se pueden clickear directo.
- Verificar el foco/visibilidad con el DOM real, no solo por clases: un elemento dentro de un contenedor `display:none` no se puede enfocar.
- Deploy: bump de `CACHE_NAME`, `firebase deploy --only firestore:rules,hosting` (si hosting devuelve 500 transitorio en el release, reintentar).
