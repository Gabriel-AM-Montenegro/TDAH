
// Cambio de secciones
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(seccion => {
    seccion.classList.add('oculto');
  });
  document.getElementById(id).classList.remove('oculto');
}

// Pomodoro
let tiempo = 25 * 60;
let intervalo;
function actualizarTimer() {
  const minutos = Math.floor(tiempo / 60);
  const segundos = tiempo % 60;
  document.getElementById('timer').innerText = `${minutos.toString().padStart(2,'0')}:${segundos.toString().padStart(2,'0')}`;
}
function startTimer() {
  if (!intervalo) {
    intervalo = setInterval(() => {
      if (tiempo > 0) {
        tiempo--;
        actualizarTimer();
      }
    }, 1000);
  }
}
function pausarPomodoro() {
  clearInterval(intervalo);
  intervalo = null;
}
function resetTimer() {
  pausarPomodoro();
  tiempo = 25 * 60;
  actualizarTimer();
}
actualizarTimer();

// Tareas
function agregarTarea() {
  const texto = document.getElementById('nuevaTarea').value;
  if (texto.trim() === '') return;
  const li = document.createElement('li');
  li.innerHTML = `<input type='checkbox' /> ${texto}`;
  document.getElementById('listaTareas').appendChild(li);
  document.getElementById('nuevaTarea').value = '';
}

// Notas
function guardarNota() {
  const texto = document.getElementById('nota').value;
  if (texto.trim() === '') return;
  const li = document.createElement('li');
  li.innerText = texto;
  document.getElementById('listaNotas').appendChild(li);
  document.getElementById('nota').value = '';
}
