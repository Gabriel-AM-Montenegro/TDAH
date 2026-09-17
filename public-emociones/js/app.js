// App sin backend: todo el estado vive en memoria (se resetea al recargar).
// Ver tools-data.js para el contenido de cada herramienta.
const root = document.getElementById('view-root');

function el(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.firstElementChild;
}

function renderHome() {
  const groups = {};
  TOOL_ORDER.forEach((id) => {
    const tool = TOOLS[id];
    if (!groups[tool.group]) groups[tool.group] = [];
    groups[tool.group].push(id);
  });

  let html = `
    <div class="card">
      <div class="tool-tile" style="cursor:pointer" id="wizard-tile">
        <span class="tool-icon">🧭</span><span class="tool-title">¿No sabés cuál usar?</span>
        <span class="tool-subtitle">Respondé un par de preguntas y te digo qué herramienta te sirve ahora.</span>
      </div>
    </div>
  `;

  Object.keys(groups).forEach((groupName) => {
    html += `<div class="group-label">${groupName}</div><div class="tool-grid">`;
    groups[groupName].forEach((id) => {
      const t = TOOLS[id];
      html += `
        <button class="tool-tile" data-tool="${id}">
          <span class="tool-icon">${t.icon}</span><span class="tool-title">${t.title}</span>
          <span class="tool-subtitle">${t.subtitle}</span>
        </button>`;
    });
    html += `</div>`;
  });

  root.innerHTML = html;
  document.getElementById('wizard-tile').addEventListener('click', () => renderWizard('start'));
  root.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => renderTool(btn.dataset.tool, 0));
  });
}

function backButton(onClick) {
  const btn = el('<button class="link-back">← Volver al inicio</button>');
  btn.addEventListener('click', onClick);
  return btn;
}

function renderTool(toolId, stepIndex) {
  const tool = TOOLS[toolId];
  const step = tool.steps[stepIndex];
  const total = tool.steps.length;

  let dotsHtml = '';
  for (let i = 0; i < total; i++) {
    let cls = 'progress-dot';
    if (i < stepIndex) cls += ' done';
    if (i === stepIndex) cls += ' active';
    dotsHtml += `<div class="${cls}"></div>`;
  }

  const introHtml = stepIndex === 0 && tool.intro ? `<p class="intro-text">${tool.intro}</p>` : '';
  const noteHtml = stepIndex === total - 1 && tool.note ? `<p class="note">${tool.note}</p>` : '';

  root.innerHTML = '';
  root.appendChild(backButton(renderHome));
  root.appendChild(el(`
    <div class="card">
      <h2 style="margin-top:0">${tool.icon} ${tool.title}</h2>
      <div class="progress">${dotsHtml}</div>
      ${introHtml}
      <div class="step-letter">${step.letter}</div>
      <div class="step-name">${step.name}</div>
      <div class="step-body">${step.body}</div>
      ${noteHtml}
      <div class="btn-row" id="tool-nav"></div>
    </div>
  `));

  const nav = document.getElementById('tool-nav');
  if (stepIndex > 0) {
    const prevBtn = el('<button class="btn secondary">Atrás</button>');
    prevBtn.addEventListener('click', () => renderTool(toolId, stepIndex - 1));
    nav.appendChild(prevBtn);
  }
  if (stepIndex < total - 1) {
    const nextBtn = el('<button class="btn">Aplicá esto a tu situación, después seguí →</button>');
    nextBtn.addEventListener('click', () => renderTool(toolId, stepIndex + 1));
    nav.appendChild(nextBtn);
  } else {
    const doneBtn = el('<button class="btn">Listo, volver al inicio</button>');
    doneBtn.addEventListener('click', renderHome);
    nav.appendChild(doneBtn);
  }
}

// Asistente para elegir herramienta — mismas preguntas que el comando
// /emociones-diagnosticar, pero como botones en vez de texto libre.
function wizardScreen(title, options) {
  root.innerHTML = '';
  root.appendChild(backButton(renderHome));
  const card = el(`<div class="card"><h2 style="margin-top:0">${title}</h2><div class="choice-list" id="choice-list"></div></div>`);
  root.appendChild(card);
  const list = card.querySelector('#choice-list');
  options.forEach((opt) => {
    const btn = el(`<button class="choice-btn">${opt.label}</button>`);
    btn.addEventListener('click', opt.onClick);
    list.appendChild(btn);
  });
}

function wizardResult(title, toolIds, extraNote) {
  root.innerHTML = '';
  root.appendChild(backButton(renderHome));
  let html = `<div class="card"><h2 style="margin-top:0">${title}</h2>`;
  if (extraNote) html += `<p class="wizard-note">${extraNote}</p>`;
  html += `<div class="tool-grid" style="margin-top:12px">`;
  toolIds.forEach((id) => {
    const t = TOOLS[id];
    html += `<button class="tool-tile" data-tool="${id}"><span class="tool-icon">${t.icon}</span><span class="tool-title">${t.title}</span><span class="tool-subtitle">${t.subtitle}</span></button>`;
  });
  html += `</div></div>`;
  root.appendChild(el(html));
  root.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => renderTool(btn.dataset.tool, 0));
  });
}

function renderWizard(step) {
  if (step === 'start') {
    wizardScreen('¿Qué está pasando?', [
      { label: 'Necesito bajar la intensidad YA, no puedo pensar con calma', onClick: () => wizardResult('Te sirve esto', ['stop', 'tip']) },
      { label: 'Ya puedo pensar, pero necesito aguantar un rato sin empeorarlo', onClick: () => wizardResult('Te sirve esto', ['aceptas', 'salvara']) },
      { label: 'Necesito pedir algo, poner un límite o resolver un conflicto', onClick: () => renderWizard('comunicar') },
      { label: 'Es una emoción fuerte que quiero entender o cambiar, no un momento puntual', onClick: () => renderWizard('regulacion') },
      { label: 'No hay nada puntual, quiero practicar prestar atención en general', onClick: () => wizardResult('Te sirve esto', ['mentesabia', 'quepracticar', 'comopracticar']) },
    ]);
    return;
  }
  if (step === 'comunicar') {
    wizardScreen('¿Cuál es tu prioridad principal en esa conversación?', [
      { label: 'Conseguir algo puntual (que el objetivo se cumpla)', onClick: () => wizardResult('Te sirve esto', ['dearman']) },
      { label: 'Mantener la relación en buenos términos', onClick: () => wizardResult('Te sirve esto', ['aves']) },
      { label: 'No perderte a vos mismo/a en la conversación', onClick: () => wizardResult('Te sirve esto', ['vida']) },
      { label: 'Un poco de todo', onClick: () => wizardResult('Te sirve esto', ['dearman', 'aves', 'vida']) },
    ]);
    return;
  }
  if (step === 'regulacion') {
    wizardScreen('¿Qué necesitás con esa emoción?', [
      { label: 'Entender de dónde viene y si tiene sentido sentirla así', onClick: () => wizardResult('Te sirve esto', ['entenderemocion', 'verificarhechos']) },
      { label: 'Que deje de mandarte tanto, o cambiarla activamente', onClick: () => wizardResult('Te sirve esto', ['accionopuesta', 'surfearemocion']) },
      { label: 'En general últimamente estás muy al límite, no es solo hoy', onClick: () => wizardResult('Te sirve esto', ['acacuida']) },
    ]);
  }
}

renderHome();

// Cartel de "hay una actualización" + auto-reload al confirmar — mismo
// patrón que NeuroKit (public/js/main.js + ui.js), adaptado a esta app sin
// módulos ES (todo en un solo archivo).
function showUpdateBanner(onUpdate) {
  const existing = document.getElementById('app-update-banner');
  if (existing) {
    const existingBtn = existing.querySelector('.app-update-banner-btn');
    if (existingBtn) existingBtn.onclick = onUpdate;
    return;
  }

  const banner = el('<div id="app-update-banner" class="app-update-banner"><span>Hay una actualización disponible.</span><button type="button" class="app-update-banner-btn">Actualizar ahora</button></div>');
  banner.querySelector('.app-update-banner-btn').onclick = onUpdate;
  document.body.appendChild(banner);
}

if ('serviceWorker' in navigator) {
  const promptToUpdate = (worker) => {
    showUpdateBanner(() => worker.postMessage({ type: 'SKIP_WAITING' }));
  };

  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      // Puede haber una actualización que ya estaba esperando de una visita
      // anterior (la app quedó en segundo plano sin llegar a recargarse).
      if (registration.waiting) promptToUpdate(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // "installed" + ya hay un controller = es una actualización, no
          // la primera instalación.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptToUpdate(newWorker);
          }
        });
      });

      // El navegador solo revisa actualizaciones al navegar — en una PWA
      // instalada que queda abierta mucho tiempo eso casi no pasa, así que
      // forzamos el chequeo cada vez que la app vuelve a primer plano.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    })
    .catch((error) => console.error('Service Worker: error al registrar:', error));

  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  });
}
