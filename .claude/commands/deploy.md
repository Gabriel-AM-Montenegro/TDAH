---
description: Deployar a producción con el checklist completo del proyecto
---

Antes de deployar, verificá y aplicá lo que falte:

1. Si el deploy incluye cualquier cambio visible (HTML/CSS/JS de `public/`), bumpear `CACHE_NAME` en `public/service-worker.js` — si no, ninguna PWA instalada (iPhone) va a ver el cartel de actualización.
2. Si se tocó `functions/` o `firestore.indexes.json`, avisame antes de correr el deploy — son cambios de backend real en producción (`tdah-app-efca9`).
3. Confirmá conmigo qué se deployea antes de correr nada — no asumas `--only hosting` por default, preguntame si también hace falta `functions` y/o `firestore:indexes`.
4. Corré `firebase deploy --only <lo que corresponda>`.
5. Después del deploy, recordame si hace falta que el usuario pruebe algo puntual en su iPhone real (push, PWA) antes de dar el deploy por confirmado.
