// ========== VARIABLES GLOBALES ==========
let tiempo = 25 * 60;      // 25 minutos en segundos
let intervalo;              // Referencia al setInterval
let enDescanso = false;     // Estado del pomodoro
let trelloConfig = {};      // Configuración de Trello
const POMODORO_DURACION = 25 * 60; // 25 minutos de trabajo
const DESCANSO_CORTO_DURACION = 5 * 60; // 5 minutos de descanso

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    cargarConfiguracion();
    actualizarTimer();
    cargarDatosLocales();
    actualizarContadores();
    solicitudPermisoNotificaciones();
    
    // Auto-sincronización de Trello cada 30 minutos
    setInterval(() => {
        if (trelloConfig.apiKey && trelloConfig.token && trelloConfig.boardId) {
            cargarTareasHoy();
        }
    }, 30 * 60 * 1000); // 30 minutos
});

// ========== NAVEGACIÓN ENTRE SECCIONES ==========
function mostrarSeccion(id) {
    // Remover active de todos los botones de navegación
    document.querySelectorAll('.nav-tabs button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Remover active de todas las secciones
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.remove('active');
    });
    
    // Activar sección correspondiente
    document.getElementById(id).classList.add('active');
    
    // Activar botón correspondiente usando el ID
    const botonActivo = document.getElementById(`btn-${id}`);
    if (botonActivo) {
        botonActivo.classList.add('active');
    }
    
    // Si es la sección de tareas, intentar cargar datos de Trello
    if (id === 'tareas' && trelloConfig.apiKey && trelloConfig.token && trelloConfig.boardId) {
        cargarTareasHoy();
    }
    // Si es la sección de notas, cargar artículos
    if (id === 'notas') {
        cargarNotasBlog();
    }
    // Si es la sección de nutrición, cargar contenido
    if (id === 'nutricion') {
        cargarNutricion();
    }
}

// ========== FUNCIONES POMODORO ==========
function actualizarTimer() {
    const minutos = Math.floor(tiempo / 60);
    const segundos = tiempo % 60;
    document.getElementById('timer').innerText = 
        `${minutos.toString().padStart(2,'0')}:${segundos.toString().padStart(2,'0')}`;
}

function startTimer() {
    if (!intervalo) {
        document.body.classList.add('timer-active');
        reproducirSonido('inicio'); // Opcional: un sonido al iniciar
        
        intervalo = setInterval(() => {
            if (tiempo > 0) {
                tiempo--;
                actualizarTimer();
            } else {
                clearInterval(intervalo);
                intervalo = null;
                document.body.classList.remove('timer-active');
                
                if (!enDescanso) {
                    mostrarNotificacion('¡Pomodoro completado! 🎉', 'Toma un descanso de 5 minutos.');
                    tiempo = DESCANSO_CORTO_DURACION; // 5 minutos descanso
                    enDescanso = true;
                    reproducirSonido('complete'); // Sonido para Pomodoro completado
                    mostrarMensajeTemporal('🎉 ¡Pomodoro completado! Es hora de un descanso.', 'success');
                } else {
                    mostrarNotificacion('¡Descanso terminado! 💪', 'Listo para otro Pomodoro.');
                    tiempo = POMODORO_DURACION; // 25 minutos trabajo
                    enDescanso = false;
                    reproducirSonido('break'); // Sonido para descanso terminado
                    mostrarMensajeTemporal('💪 ¡Descanso terminado! Es hora de volver al trabajo.', 'info');
                }
                actualizarTimer();
            }
        }, 1000);
    }
}

function pausarPomodoro() {
    clearInterval(intervalo);
    intervalo = null;
    document.body.classList.remove('timer-active');
    mostrarMensajeTemporal('⏸️ Pomodoro pausado.');
}

function resetTimer() {
    pausarPomodoro();
    tiempo = POMODORO_DURACION;
    enDescanso = false;
    actualizarTimer();
    mostrarMensajeTemporal('🔄 Pomodoro reiniciado.');
}

// ========== FUNCIONES CHECKLIST ==========
function addCheckItem() {
    const input = document.getElementById('checkItem');
    const texto = input.value.trim();
    
    if (texto === '') {
        input.focus();
        mostrarMensajeTemporal('💡 El elemento del checklist no puede estar vacío.', 'warning');
        return;
    }
    
    const li = document.createElement('li');
    li.innerHTML = `
        <input type='checkbox' onchange="toggleCheckItem(this)"> 
        <span>${texto}</span>
        <button onclick="eliminarItem(this)" class="button-danger">❌</button>
    `;
    
    document.getElementById('checkList').appendChild(li);
    input.value = '';
    input.focus(); // Mantener foco para agregar más elementos rápidamente
    
    guardarDatosLocales();
    actualizarContadores();
    
    mostrarMensajeTemporal('✅ Elemento agregado al checklist');
}

function toggleCheckItem(checkbox) {
    const li = checkbox.parentElement;
    const span = li.querySelector('span');
    
    if (checkbox.checked) {
        li.classList.add('task-completed');
        reproducirSonido('task-done');
        mostrarMensajeTemporal('✅ Tarea completada. ¡Buen trabajo!');
    } else {
        li.classList.remove('task-completed');
        mostrarMensajeTemporal('↩️ Tarea desmarcada.');
    }
    
    guardarDatosLocales();
}

function eliminarItem(button) {
    // Implementación del botón de eliminar dentro del li con un confirm
    if (confirm('¿Estás seguro de que quieres eliminar este elemento del checklist?')) {
        button.parentElement.remove();
        guardarDatosLocales();
        actualizarContadores();
        mostrarMensajeTemporal('🗑️ Elemento eliminado del checklist.');
    }
}

// ========== CONFIGURACIÓN TRELLO ==========
function cargarConfiguracion() {
    const config = localStorage.getItem('trelloConfig');
    if (config) {
        trelloConfig = JSON.parse(config);
        
        // Llenar los campos si existen
        document.getElementById('api-key').value = trelloConfig.apiKey || '';
        document.getElementById('token').value = trelloConfig.token || '';
        document.getElementById('board-id').value = trelloConfig.boardId || '';
        
        // Si tenemos configuración completa, actualizar estado
        if (trelloConfig.apiKey && trelloConfig.token && trelloConfig.boardId) {
            actualizarEstadoTrello(true);
            cargarTareasHoy(); // Cargar tareas automáticamente
        }
    }
}

function guardarConfigTrello() {
    const apiKey = document.getElementById('api-key').value.trim();
    const token = document.getElementById('token').value.trim();
    const boardId = document.getElementById('board-id').value.trim();
    
    if (!apiKey || !token || !boardId) {
        mostrarMensajeTemporal('❌ Por favor completa todos los campos de Trello.', 'error');
        return;
    }
    
    trelloConfig = { apiKey, token, boardId };
    localStorage.setItem('trelloConfig', JSON.stringify(trelloConfig));
    
    mostrarMensajeExito('💾 Configuración de Trello guardada exitosamente.');
    actualizarEstadoTrello(true);
    
    // Intentar cargar tareas inmediatamente
    setTimeout(() => {
        cargarTareasHoy();
    }, 500); // Pequeño retraso para que el mensaje se vea
}

async function probarConexionTrello() {
    const apiKey = document.getElementById('api-key').value.trim();
    const token = document.getElementById('token').value.trim();
    const boardId = document.getElementById('board-id').value.trim();
    
    if (!apiKey || !token || !boardId) {
        mostrarMensajeTemporal('❌ Por favor completa todos los campos antes de probar la conexión.', 'warning');
        return;
    }
    
    const button = document.querySelector('button[onclick="probarConexionTrello()"]');
    const textoOriginal = button.textContent;
    button.textContent = '🔄 Probando...';
    button.disabled = true;

    try {
        const response = await fetch(
            `https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${token}`
        );
        
        if (response.ok) {
            const board = await response.json();
            mostrarMensajeExito(`✅ ¡Conexión exitosa con el board: "${board.name}"!`);
            actualizarEstadoTrello(true);
            
            // Guardar configuración automáticamente si la prueba es exitosa
            trelloConfig = { apiKey, token, boardId };
            localStorage.setItem('trelloConfig', JSON.stringify(trelloConfig));
            
            cargarTareasHoy();
        } else {
            const errorData = await response.json();
            throw new Error(`Error HTTP: ${response.status} - ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Error de conexión con Trello:', error);
        mostrarMensajeError('❌ Error de conexión con Trello. Verifica tus credenciales y que el Board ID sea correcto.');
        actualizarEstadoTrello(false);
    } finally {
        button.textContent = textoOriginal;
        button.disabled = false;
    }
}

function actualizarEstadoTrello(conectado) {
    const statusDiv = document.getElementById('trello-status');
    const configCard = document.getElementById('config-card');
    const tareasContent = document.getElementById('tareas-content');
    
    if (conectado) {
        statusDiv.textContent = '✅ Trello conectado';
        statusDiv.className = 'status-indicator status-connected';
        configCard.classList.add('connected');
        tareasContent.style.display = 'none'; // Ocultar el mensaje de configuración si está conectado
    } else {
        statusDiv.textContent = '❌ Trello no conectado';
        statusDiv.className = 'status-indicator status-disconnected';
        configCard.classList.remove('connected');
        tareasContent.style.display = 'block'; // Mostrar el mensaje de configuración si no está conectado
    }
}

async function cargarTareasHoy() {
    const listaTareas = document.getElementById('listaTareas');
    const tareasContent = document.getElementById('tareas-content');

    if (!trelloConfig.apiKey || !trelloConfig.token || !trelloConfig.boardId) {
        listaTareas.innerHTML = ''; // Limpiar tareas anteriores
        tareasContent.innerHTML = '<p>Configura tu conexión a Trello para ver las tareas que vencen hoy.</p><button onclick="mostrarSeccion(\'config\')">⚙️ Configurar Trello</button>';
        tareasContent.style.display = 'block';
        return;
    }
    
    listaTareas.innerHTML = '<li>Cargando tareas de Trello...</li>';
    tareasContent.style.display = 'none'; // Ocultar el mensaje de configuración mientras carga

    try {
        const response = await fetch(
            `https://api.trello.com/1/boards/${trelloConfig.boardId}/cards?key=${trelloConfig.apiKey}&token=${trelloConfig.token}`
        );
        
        if (response.ok) {
            const cards = await response.json();
            
            // Filtrar tareas que vencen hoy
            const hoyInicio = new Date();
            hoyInicio.setHours(0, 0, 0, 0);
            const hoyFin = new Date();
            hoyFin.setHours(23, 59, 59, 999);
            
            const tareasHoy = cards.filter(card => {
                if (card.due) {
                    const fechaVencimiento = new Date(card.due);
                    return fechaVencimiento >= hoyInicio && fechaVencimiento <= hoyFin;
                }
                return false;
            });
            
            mostrarTareasHoyEnLista(tareasHoy);
            localStorage.setItem('lastSync', new Date().toLocaleString());
            actualizarContadores();
            mostrarMensajeTemporal('🔄 Tareas de Trello actualizadas.', 'info');
        } else {
            console.error('Error al cargar tareas de Trello:', response.statusText);
            mostrarMensajeError('❌ Error al cargar tareas de Trello. Verifica tu conexión y permisos.');
            listaTareas.innerHTML = '<li>Error al cargar tareas.</li>';
        }
    } catch (error) {
        console.error('Error de red al cargar tareas de Trello:', error);
        mostrarMensajeError('❌ Error de red al cargar tareas de Trello. Intenta nuevamente más tarde.');
        listaTareas.innerHTML = '<li>Error de red.</li>';
    }
} 

// Helper para mostrar las tareas en la lista (evita duplicar lógica)
function mostrarTareasHoyEnLista(tareas) {
    const listaTareas = document.getElementById('listaTareas');
    listaTareas.innerHTML = ''; // Limpiar la lista antes de añadir
    
    if (tareas.length === 0) {
        listaTareas.innerHTML = '<li>🎉 ¡No tienes tareas de Trello venciendo hoy!</li>';
        return;
    }

    tareas.forEach(tarea => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${tarea.name}</span>
            <small>Vence: ${new Date(tarea.due).toLocaleDateString()}</small>
            <a href="${tarea.url}" target="_blank" class="trello-link">Ver en Trello ↗️</a>
        `;
        // Podrías añadir un botón para "completar" o "abrir en Trello" si lo necesitas
        listaTareas.appendChild(li);
    });
}

// ========== MANEJO DE DATOS LOCALES ==========
function guardarDatosLocales() {
    const items = [];
    document.querySelectorAll('#checkList li').forEach(li => {
        const texto = li.querySelector('span').textContent;
        const completado = li.querySelector('input[type="checkbox"]').checked;
        items.push({ texto, completado });
    });
    localStorage.setItem('checklist', JSON.stringify(items));
}

function cargarDatosLocales() {
    const data = localStorage.getItem('checklist');
    if (data) {
        const items = JSON.parse(data);
        const lista = document.getElementById('checkList');
        lista.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type='checkbox' ${item.completado ? 'checked' : ''} onchange="toggleCheckItem(this)"> 
                <span ${item.completado ? 'style="text-decoration: line-through;"' : ''}>${item.texto}</span>
                <button onclick="eliminarItem(this)" class="button-danger">❌</button>
            `;
            if (item.completado) li.classList.add('task-completed');
            lista.appendChild(li);
        });
    }
}

function actualizarContadores() {
    const checklist = JSON.parse(localStorage.getItem('checklist') || '[]');
    const tareasCount = document.querySelectorAll('#listaTareas li').length; // Contar items actuales, no solo al cargar
    const ultimaSync = localStorage.getItem('lastSync') || 'Nunca';

    document.getElementById('checklist-count').textContent = checklist.length;
    document.getElementById('tasks-count').textContent = tareasCount;
    document.getElementById('last-sync').textContent = ultimaSync;
}

function limpiarDatos() {
    if (confirm('¿Estás seguro de que quieres limpiar TODOS los datos guardados (configuración de Trello y checklist)? Esta acción no se puede deshacer.')) {
        localStorage.clear();
        trelloConfig = {}; // Resetear la configuración en memoria
        document.getElementById('api-key').value = '';
        document.getElementById('token').value = '';
        document.getElementById('board-id').value = '';
        document.getElementById('checkList').innerHTML = '';
        document.getElementById('listaTareas').innerHTML = ''; // Limpiar la lista de tareas de Trello
        actualizarEstadoTrello(false); // Desconectar Trello visualmente
        actualizarContadores();
        resetTimer(); // Resetear el pomodoro también
        mostrarMensajeExito('🗑️ Todos los datos han sido limpiados exitosamente.');
    }
}

// ========== FUNCIONES DE FEEDBACK Y NOTIFICACIONES ==========
function mostrarMensajeTemporal(mensaje, tipo = 'info', duracion = 3000) {
    const container = document.getElementById('temp-message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message ${tipo}`; // Clases CSS para diferentes tipos (info, success, warning, error)
    messageDiv.textContent = mensaje;
    
    container.appendChild(messageDiv);

    // Forzar reflow para que la animación CSS se dispare
    messageDiv.offsetWidth; 
    messageDiv.classList.add('show');

    setTimeout(() => {
        messageDiv.classList.remove('show');
        messageDiv.classList.add('hide'); // Añadir clase para fade out

        messageDiv.addEventListener('transitionend', () => {
            messageDiv.remove();
        }, { once: true }); // Eliminar el div después de la animación de ocultación
    }, duracion);
}

function mostrarMensajeExito(mensaje) {
    const successDiv = document.getElementById('trello-success-message');
    if (successDiv) {
        successDiv.textContent = mensaje;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000); // Mostrar por 5 segundos
    }
    mostrarMensajeTemporal(mensaje, 'success');
}

function mostrarMensajeError(mensaje) {
    mostrarMensajeTemporal(mensaje, 'error', 7000); // Mensajes de error más duraderos
}

function solicitudPermisoNotificaciones() {
    if (!("Notification" in window)) {
        console.warn("Este navegador no soporta notificaciones de escritorio.");
        return;
    }
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                mostrarMensajeTemporal('🔔 Notificaciones habilitadas. ¡Te avisaremos cuando sea hora de un descanso!');
            } else {
                mostrarMensajeTemporal('⚠️ Notificaciones deshabilitadas. No podremos enviarte alertas de tiempo.', 'warning');
            }
        });
    }
}

function mostrarNotificacion(titulo, cuerpo) {
    if (Notification.permission === "granted") {
        new Notification(titulo, { body: cuerpo, icon: 'icon.png' }); // Asegúrate de tener un icon.png
    }
}

function reproducirSonido(tipo) {
    let audio;
    switch (tipo) {
        case 'complete':
            audio = document.getElementById('sound-complete');
            break;
        case 'break':
            audio = document.getElementById('sound-break');
            break;
        case 'task-done':
            audio = document.getElementById('sound-task-done');
            break;
        default:
            // Puedes añadir un sonido por defecto o no hacer nada
            return;
    }
    if (audio) {
        audio.play().catch(e => console.error("Error al reproducir sonido:", e));
    }
}

// ========== FUNCIONES PARA SECCIONES FUTURAS (Notas de Blog, Nutrición) ==========
async function cargarNotasBlog() {
    const blogContent = document.getElementById('blog-content');
    blogContent.innerHTML = '<p>Cargando los últimos artículos... Esto podría tardar un momento.</p>';
    // Aquí iría la lógica para hacer fetch a tu API de blog o RSS feed.
    // Ejemplo de cómo se vería el contenido (simulado):
    setTimeout(() => {
        blogContent.innerHTML = `
            <div class="blog-article-card">
                <h4>Entendiendo el TDAH: Mitos y Realidades</h4>
                <p>Descubre lo que realmente significa vivir con TDAH y desmiente concepciones erróneas comunes...</p>
                <small>Fuente: Blog de Neurodiversidad</small>
                <a href="#" target="_blank" class="article-link">Leer más ↗️</a>
            </div>
            <div class="blog-article-card">
                <h4>Estrategias de Productividad para TDAH</h4>
                <p>Consejos prácticos y herramientas que pueden ayudarte a mantener el enfoque y completar tus tareas...</p>
                <small>Fuente: ADHD Focus Hub</small>
                <a href="#" target="_blank" class="article-link">Leer más ↗️</a>
            </div>
            <div class="blog-article-card">
                <h4>Mindfulness para TDAH: Calma tu Mente</h4>
                <p>Explora cómo la atención plena puede ser una herramienta poderosa para manejar la distracción y la impulsividad...</p>
                <small>Fuente: Zen Habits</small>
                <a href="#" target="_blank" class="article-link">Leer más ↗️</a>
            </div>
        `;
        mostrarMensajeTemporal('📚 Artículos de blog cargados.', 'success');
    }, 1500); // Simula una carga
}

async function cargarNutricion() {
    const nutricionContent = document.getElementById('nutricion-content');
    nutricionContent.innerHTML = '<p>Buscando recetas y recomendaciones nutricionales... Ten paciencia.</p>';
    // Aquí iría la lógica para hacer fetch a tu API de nutrición o blog de recetas.
    // Ejemplo de cómo se vería el contenido (simulado):
    setTimeout(() => {
        nutricionContent.innerHTML = `
            <div class="nutricion-card">
                <h4>Recetas Rápidas y Saludables para el Cerebro</h4>
                <p>Ideas de comidas fáciles de preparar y ricas en nutrientes que apoyan la función cerebral...</p>
                <small>Fuente: Recetas Saludables</small>
                <a href="#" target="_blank" class="article-link">Ver recetas ↗️</a>
            </div>
            <div class="nutricion-card">
                <h4>Alimentos que Influyen en el Enfoque y la Energía</h4>
                <p>Descubre qué alimentos pueden mejorar tu concentración y cuáles evitar para mantener la energía estable...</p>
                <small>Fuente: NutriMente</small>
                <a href="#" target="_blank" class="article-link">Saber más ↗️</a>
            </div>
        `;
        mostrarMensajeTemporal('🍎 Contenido de nutrición cargado.', 'success');
    }, 1800); // Simula una carga
}