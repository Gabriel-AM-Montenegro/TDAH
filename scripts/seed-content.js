// Script de mantenimiento: carga los artículos de Blog y Nutrición (contenido de
// solo lectura para los usuarios, curado a mano) en Firestore.
//
// Las reglas de seguridad (firestore.rules) bloquean la escritura en estas
// colecciones desde el frontend a propósito: solo un proceso con credenciales
// de admin (este script) puede escribirlas.
//
// Uso:
//   1. npm install firebase-admin   (en esta misma carpeta o en una carpeta aparte)
//   2. Descargar una clave de servicio: Firebase Console > Configuración del proyecto >
//      Cuentas de servicio > Generar nueva clave privada. NO commitear ese .json.
//   3. Modo simulación (no escribe nada, solo muestra qué escribiría):
//        node seed-content.js ./service-account.json
//   4. Modo real (escribe de verdad):
//        node seed-content.js ./service-account.json --confirm

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const serviceAccountPath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!serviceAccountPath) {
    console.error('Uso: node seed-content.js <ruta-a-service-account.json> [--confirm]');
    process.exit(1);
}

const serviceAccount = require(require('path').resolve(serviceAccountPath));

const app = initializeApp({
    credential: cert(serviceAccount),
});
const db = getFirestore(app);

// Debe coincidir con `publicDataDocId` en public/js/firebase.js (a propósito
// difiere en un dígito de `appId`: ahí vive la data pública real hoy).
const PUBLIC_DATA_DOC_ID = '1:765424031369:web:838eca686f68f21daa5858';

const blogArticles = [
    {
        title: '"Ceguera del tiempo": por qué el reloj no funciona igual en el TDAH',
        content: 'La dificultad para estimar cuánto falta, cuánto pasó o cuánto dura una tarea no es falta de voluntad: es un déficit ejecutivo real, ligado a una corteza prefrontal —la que regula la percepción del tiempo— con menor actividad en TDAH. Un estudio de 2025 encontró una relación directa entre la organización en el tiempo, las funciones ejecutivas y la calidad de vida en adultos con TDAH. Por eso funcionan los timers visibles y las alarmas externas (como el Pomodoro de esta app): no reemplazan el reloj interno, se lo prestan.',
        source: 'PMC — "The Relationship Between Organization in Time, Executive Functions, and Quality of Life in Adult ADHD" (2025)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12730932/',
    },
    {
        title: 'El ejercicio como "medicación extra": qué dice la evidencia',
        content: 'Un metaanálisis de 2025 (42 ensayos controlados) encontró mejoras significativas en síntomas centrales, funciones ejecutivas y calidad subjetiva del sueño con actividad física regular. Otro metaanálisis específico en adultos mostró beneficios en control inhibitorio. No reemplaza el tratamiento, pero la evidencia es cada vez más sólida como complemento.',
        source: 'JOGH (2025); Adolescent Research Review (2026)',
        url: 'https://jogh.org/2025/jogh-15-04025',
    },
    {
        title: 'Por qué cuesta tanto "apagar la cabeza" a la noche',
        content: 'Hasta el 80% de los adultos con TDAH tiene alteraciones del sueño, y en un 78% el reloj biológico está corrido (inicio de melatonina ~90 minutos más tarde de lo típico). No es indisciplina, es un desfasaje circadiano real. La evidencia más sólida hoy: luz brillante a la mañana apenas te despertás, y horarios fijos de sueño/vigilia.',
        source: 'Frontiers in Psychiatry (2025), revisión sobre TDAH como trastorno circadiano',
        url: 'https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1697900/full',
    },
    {
        title: 'La vergüenza no es una estrategia (y la autocompasión sí ayuda)',
        content: 'Un estudio de 2025 documentó que la autocrítica acumulada en adultos con TDAH se convierte en creencias de "no valer lo suficiente", lo que empeora el funcionamiento, no lo mejora. Las intervenciones de autocompasión (incluso ejercicios breves de escritura) muestran resultados prometedores para reducir vergüenza y mejorar la búsqueda de ayuda.',
        source: 'British Journal of Occupational Therapy (2025) — Paley, Maeir & Shor',
        url: 'https://journals.sagepub.com/doi/10.1177/03080226241296684',
    },
    {
        title: '¿Sirven de verdad las apps con puntos y recompensas?',
        content: 'La evidencia 2024-2025 es mixta pero alentadora: las apps con gamificación logran más días de uso activo, y las que suman retroalimentación instantánea y elementos sociales rinden mejor en ensayos clínicos. El mayor problema no es si "funcionan" sino la caída de uso con el tiempo — por eso conviene que un sistema de puntos esté ligado a hábitos concretos, no solo a completar tareas.',
        source: 'PMC (2025), revisión de intervenciones digitales en salud',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12549263/',
    },
];

const nutritionArticles = [
    {
        title: 'Omega-3: ayuda, pero no es magia',
        content: 'Los metaanálisis muestran heterogeneidad alta: el omega-3 ayuda más cuando el nivel basal en sangre ya es bajo, y el efecto sobre síntomas centrales es modesto comparado con la medicación estimulante. Vale como complemento, no como sustituto.',
        source: 'Frontiers in Public Health (2026), metaanálisis estratificado por biomarcadores',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
    },
    {
        title: 'Ultraprocesados: la asociación es real, la causa todavía se está estudiando',
        content: 'Un estudio reciente encontró que el consumo de ultraprocesados por encima de la mediana se asocia con TDAH incluso ajustando por edad, nivel socioeconómico y fibra dietaria. El mecanismo propuesto: azúcares refinados y grasas saturadas alteran la actividad dopaminérgica y promueven neuroinflamación.',
        source: 'Pediatric Research (2026); Food Frontiers (2025)',
        url: 'https://www.nature.com/articles/s41390-026-04844-5',
    },
    {
        title: 'Los déficits que más aparecen en TDAH: hierro, zinc, magnesio y vitaminas B',
        content: 'Una revisión de 2025 sobre omega-3 y TDAH documentó también déficits recurrentes de cobre, hierro, zinc, magnesio, selenio, folato y vitaminas B1, B2, B6, B9 y B12 en personas con TDAH. Antes de suplementar a ciegas, un análisis de sangre es más útil que adivinar.',
        source: 'Frontiers in Public Health (2026)',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
    },
    {
        title: 'Mejorar la dieta en general funciona mejor que las dietas de eliminación estrictas',
        content: 'Un ensayo de 2024 mostró que una dieta general más saludable superó a la dieta de eliminación (quitar colorantes, aditivos, etc.) en la mayoría de los chicos con TDAH estudiados. Menos restricción, más sostenible.',
        source: 'Ensayo clínico 2024 citado en revisión sobre patrones dietarios y TDAH (Dr. Lewis, 2025)',
        url: 'https://drlewis.com/dietary-patterns-and-adhd/',
    },
    // Recetas: simples, pocos pasos, pensadas para baja energía ejecutiva
    // (poca planificación, poco lavado, aptas para preparar en tanda).
    {
        title: 'Receta: Huevos revueltos con espinaca y tostada integral (5 min)',
        content: 'Ingredientes: 2 huevos, un puñado de espinaca fresca, 1 tostada de pan integral, sal y pimienta.\nPreparación: batí los huevos, salteá la espinaca 1 minuto en la misma sartén, agregá los huevos y revolvé 2-3 minutos a fuego medio. Serví sobre la tostada.\nPor qué ayuda: el huevo aporta B12 y proteína completa, y la espinaca suma hierro y magnesio — dos de los déficits más frecuentes documentados en TDAH.',
        source: 'Aporta hierro, B12 y magnesio — ver "Los déficits que más aparecen en TDAH"',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
        type: 'recipe',
        nutrients: ['hierro', 'magnesio', 'vitamina-b'],
    },
    {
        title: 'Receta: Avena overnight con semillas de chía (2 min, se arma la noche anterior)',
        content: 'Ingredientes: 1/2 taza de avena, 1 taza de leche o bebida vegetal, 1 cucharada de semillas de chía o lino molido, fruta picada al gusto.\nPreparación: mezclá todo en un frasco la noche anterior y dejá en la heladera. A la mañana está lista, sin cocinar nada. Podés armar 3-4 frascos de una sola vez.\nPor qué ayuda: la chía y el lino aportan omega-3 vegetal, y la avena da energía estable sin el pico de glucosa de un desayuno azucarado. Prepararla de antemano saca una decisión más de la mañana.',
        source: 'Aporta omega-3 y evita picos de glucosa — ver "Omega-3: ayuda, pero no es magia"',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
        type: 'recipe',
        nutrients: ['omega-3'],
    },
    {
        title: 'Receta: Salmón al horno con batata (20 min, casi sin intervención)',
        content: 'Ingredientes: 1 filet de salmón, 1 batata mediana en cubos, aceite de oliva, sal, limón.\nPreparación: horno a 200°C. La batata sola 10 minutos, después el salmón encima 12-15 minutos más. Un solo pan, casi nada para lavar.\nPor qué ayuda: el salmón es una de las fuentes más concentradas de omega-3 EPA/DHA (los que muestran más evidencia en TDAH), y la batata suma magnesio.',
        source: 'Aporta omega-3 EPA/DHA y magnesio — ver "Omega-3: ayuda, pero no es magia"',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
        type: 'recipe',
        nutrients: ['omega-3', 'magnesio'],
    },
    {
        title: 'Receta: Batido de espinaca, banana y mantequilla de maní (5 min, sin cocción)',
        content: 'Ingredientes: 1 banana, un puñado de espinaca, 1 cucharada de mantequilla de maní, 1 taza de leche o bebida vegetal.\nPreparación: licuar todo. Listo.\nPor qué ayuda: combina hierro (espinaca), magnesio y proteína (maní) en un formato que no requiere planificar ni cocinar — útil en los días de baja energía.',
        source: 'Aporta hierro, magnesio y proteína — ver "Los déficits que más aparecen en TDAH"',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
        type: 'recipe',
        nutrients: ['hierro', 'magnesio'],
    },
    {
        title: 'Receta: Lentejas con arroz integral (30 min, rinde para varios días)',
        content: 'Ingredientes: 1 taza de lentejas, 1 taza de arroz integral, cebolla, ajo, comino, aceite de oliva.\nPreparación: rehogá cebolla y ajo, agregá las lentejas con agua y comino, cociná 20-25 minutos. Arroz aparte. Se puede freezar en porciones.\nPor qué ayuda: las lentejas aportan hierro no-hemo y zinc, y cocinar en tanda grande (batch cooking) reduce la cantidad de decisiones de comida durante la semana.',
        source: 'Aporta hierro y zinc — ver "Los déficits que más aparecen en TDAH"',
        url: 'https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1844881/full',
        type: 'recipe',
        nutrients: ['hierro', 'zinc'],
    },
];

// Timestamps espaciados por minuto, en orden decreciente, para que el primer
// artículo de cada lista sea el más "reciente" (orderBy('timestamp', 'desc')).
function withTimestamps(items) {
    const base = Date.now();
    return items.map((item, index) => ({
        ...item,
        timestamp: Timestamp.fromMillis(base - index * 60000),
    }));
}

async function seedCollection(collectionRef, items, label) {
    const existingSnapshot = await collectionRef.get();
    console.log(`\n${label}: ${existingSnapshot.size} documento(s) existente(s) se borrarían, ${items.length} artículo(s) nuevo(s) se escribirían en ${collectionRef.path}`);
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item.title}`));

    if (!confirmed) {
        return;
    }

    // Reemplazo completo: borra todo lo que haya en la colección antes de
    // insertar el set actual, para que correr el script de nuevo (ej. tras
    // corregir una URL) no acumule documentos duplicados con el mismo título.
    const deleteBatch = db.batch();
    existingSnapshot.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();

    const insertBatch = db.batch();
    items.forEach((item) => {
        const docRef = collectionRef.doc();
        insertBatch.set(docRef, item);
    });
    await insertBatch.commit();
    console.log(`  -> ${existingSnapshot.size} borrado(s), ${items.length} documento(s) nuevo(s) escrito(s) en ${label}.`);
}

async function main() {
    const blogCollectionRef = db.collection('artifacts').doc(PUBLIC_DATA_DOC_ID).collection('blogArticles');
    const nutricionCollectionRef = db
        .collection('artifacts')
        .doc(PUBLIC_DATA_DOC_ID)
        .collection('public')
        .doc('data')
        .collection('nutritionContent');

    await seedCollection(blogCollectionRef, withTimestamps(blogArticles), 'Blog');
    await seedCollection(nutricionCollectionRef, withTimestamps(nutritionArticles), 'Nutrición');

    if (!confirmed) {
        console.log('\nModo simulación: no se escribió nada.');
        console.log('Para escribir de verdad, corré de nuevo agregando --confirm al final.');
    } else {
        console.log('\nListo.');
    }
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
