# Links con seguimiento (UTM) de NeuroKit

Todos los links que se comparten desde canales de marketing (LinkedIn, Instagram, YouTube, mensajes directos) llevan parámetros UTM al final de la URL. Firebase Analytics los toma solos, sin que haga falta tocar código — ver la nota "Firebase Analytics" en `CLAUDE.md`. Para ver los resultados: **Firebase Console → Analytics → Adquisición de tráfico**, filtrando por `Campaign`, `Source` o `Medium`.

## Links activos

| Canal / uso | Link |
|---|---|
| Página de LinkedIn — post de presentación | `https://neurokit-app.web.app/?utm_source=linkedin&utm_medium=social&utm_campaign=page-intro` |
| Perfil personal — post "agenda unificada" | `https://neurokit-app.web.app/?utm_source=linkedin&utm_medium=social&utm_campaign=profile-agenda-unificada` |
| Perfil personal — post "percepción laboral" (cómo se malinterpreta a los perfiles neurodivergentes) | `https://neurokit-app.web.app/?utm_source=linkedin&utm_medium=social&utm_campaign=profile-percepcion-laboral` |
| Mensaje directo por LinkedIn (genérico) | `https://neurokit-app.web.app/?utm_source=linkedin&utm_medium=message&utm_campaign=dm-directo` |
| Bio de Instagram | `https://neurokit-app.web.app/?utm_source=instagram&utm_medium=bio` |
| Bio/descripción de YouTube | `https://neurokit-app.web.app/?utm_source=youtube&utm_medium=bio` |
| Recomendación de Carla / NeuroImpact a sus clientes | `https://neurokit-app.web.app/?utm_source=neuroimpact&utm_medium=referral&utm_campaign=empleados` |
| Perfil personal — post "nuevas features" (Garage de Ideas + Técnicas) | `https://neurokit-app.web.app/?utm_source=linkedin&utm_medium=social&utm_campaign=profile-nuevas-features` |
| Descripción del Short de YouTube "presentación NeuroKit" | `https://neurokit-app.web.app/?utm_source=youtube&utm_medium=video&utm_campaign=presentacion-neurokit` |

## Cómo armar uno nuevo

Estructura fija: `https://neurokit-app.web.app/?utm_source=<canal>&utm_medium=<tipo>&utm_campaign=<identificador>`

- **utm_source**: el canal — `linkedin`, `instagram`, `youtube`, `whatsapp`, `email`, un partner/aliado (ej. `neuroimpact`), etc.
- **utm_medium**: el tipo de contenido — `social` (post público), `message` (mensaje directo/DM), `bio` (link fijo del perfil), `referral` (recomendación de un tercero/aliado), `video` (link en la descripción de un video puntual).
- **utm_campaign**: identifica el envío puntual — el nombre del post, o el nombre de la persona si es un mensaje directo a alguien en particular (ej. `utm_campaign=carla-neuroimpact`).

Para un mensaje directo a una persona específica, usar el mismo patrón que el genérico de arriba pero con un `utm_campaign` que la identifique, en vez de `dm-directo`.
