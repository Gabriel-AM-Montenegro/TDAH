---
description: Reescribir un texto para que no "suene a IA"
---

Reescribí para que no suene a IA: $ARGUMENTS

**Si `$ARGUMENTS` es un texto puntual** (pegado directo): reescribilo y devolvémelo en el chat, no toques archivos.

**Si `$ARGUMENTS` dice "todo el proyecto", "proyecto", o no da un texto puntual**: es modo barrido. Buscá copy visible para el usuario final en:
- `public/index.html`
- Strings de texto (no código) dentro de `public/js/features/*.js` (bienvenida, botones, mensajes — no nombres de variables ni comentarios)
- `documentacion/neurokit_manual_de_marca.html` si el pedido es sobre tono de marca

Para cada archivo: mostrame el antes/después de cada bloque de texto, y preguntame si aplico el cambio antes de editar — no edites todo de una sin confirmar.

Reglas de reescritura (aplican en los dos modos):
1. Sacá em-dashes, "en resumen", "es importante destacar", "espero que te sirva" y cualquier muletilla típica de IA.
2. Frases de largo desigual, como hablaría una persona real — no todas parejitas.
3. Mantené la voz de marca de NeuroKit / Un Cerebro Diferente (cercana, directa, sin sonar clínica ni de manual).
4. No agregues información nueva, solo reescribí — el contenido tiene que quedar igual.
