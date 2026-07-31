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
        content: 'La dificultad para estimar cuánto falta, cuánto pasó o cuánto dura una tarea no es falta de voluntad: es un déficit ejecutivo medido de forma consistente en más de 55 estudios. La corteza prefrontal —que regula la percepción del tiempo— muestra menor actividad en TDAH, y un estudio de 2025 con más de 30.000 adultos en Reino Unido vinculó esto directamente con decisiones de vida y desempeño laboral. Por eso funcionan los timers visibles y las alarmas externas (como el Pomodoro de esta app): no reemplazan el reloj interno, se lo prestan.',
        source: 'The British Journal of Psychiatry (2025); meta-análisis de percepción temporal',
        url: '',
    },
    {
        title: 'El ejercicio como "medicación extra": qué dice la evidencia',
        content: 'Un metaanálisis de 2025 (42 ensayos controlados) encontró mejoras significativas en síntomas centrales, funciones ejecutivas y calidad subjetiva del sueño con actividad física regular. Otro metaanálisis específico en adultos mostró beneficios en control inhibitorio. No reemplaza el tratamiento, pero la evidencia es cada vez más sólida como complemento.',
        source: 'JOGH (2025); Adolescent Research Review (2026)',
        url: '',
    },
    {
        title: 'Por qué cuesta tanto "apagar la cabeza" a la noche',
        content: 'Hasta el 80% de los adultos con TDAH tiene alteraciones del sueño, y en un 78% el reloj biológico está corrido (inicio de melatonina ~90 minutos más tarde de lo típico). No es indisciplina, es un desfasaje circadiano real. La evidencia más sólida hoy: luz brillante a la mañana apenas te despertás, y horarios fijos de sueño/vigilia.',
        source: 'Frontiers in Psychiatry (2025), revisión sobre TDAH como trastorno circadiano',
        url: '',
    },
    {
        title: 'La vergüenza no es una estrategia (y la autocompasión sí ayuda)',
        content: 'Un estudio de 2025 documentó que la autocrítica acumulada en adultos con TDAH se convierte en creencias de "no valer lo suficiente", lo que empeora el funcionamiento, no lo mejora. Las intervenciones de autocompasión (incluso ejercicios breves de escritura) muestran resultados prometedores para reducir vergüenza y mejorar la búsqueda de ayuda.',
        source: 'Journal of Occupational Therapy (2025); American University, estudio sobre escritura autocompasiva (2024)',
        url: '',
    },
    {
        title: '¿Sirven de verdad las apps con puntos y recompensas?',
        content: 'La evidencia 2024-2025 es mixta pero alentadora: las apps con gamificación logran más días de uso activo, y las que suman retroalimentación instantánea y elementos sociales rinden mejor en ensayos clínicos. El mayor problema no es si "funcionan" sino la caída de uso con el tiempo — por eso conviene que un sistema de puntos esté ligado a hábitos concretos, no solo a completar tareas.',
        source: 'PMC (2025), revisión de intervenciones digitales; JMIR mHealth (2024)',
        url: '',
    },
];

const nutritionArticles = [
    {
        title: 'Omega-3: ayuda, pero no es magia',
        content: 'Los metaanálisis muestran heterogeneidad alta: el omega-3 ayuda más cuando el nivel basal en sangre ya es bajo, y el efecto sobre síntomas centrales es modesto comparado con la medicación estimulante. Vale como complemento, no como sustituto.',
        source: 'Frontiers in Public Health (2026), metaanálisis estratificado por biomarcadores',
        url: '',
    },
    {
        title: 'Ultraprocesados: la asociación es real, la causa todavía se está estudiando',
        content: 'Un estudio reciente encontró que el consumo de ultraprocesados por encima de la mediana se asocia con TDAH incluso ajustando por edad, nivel socioeconómico y fibra dietaria. El mecanismo propuesto: azúcares refinados y grasas saturadas alteran la actividad dopaminérgica y promueven neuroinflamación.',
        source: 'Pediatric Research (2026); Food Frontiers (2025)',
        url: '',
    },
    {
        title: 'Los déficits que más aparecen en TDAH: hierro, zinc, magnesio y vitaminas B',
        content: 'Una revisión de 2025 sobre omega-3 y TDAH documentó también déficits recurrentes de cobre, hierro, zinc, magnesio, selenio, folato y vitaminas B1, B2, B6, B9 y B12 en personas con TDAH. Antes de suplementar a ciegas, un análisis de sangre es más útil que adivinar.',
        source: 'Frontiers in Public Health (2026)',
        url: '',
    },
    {
        title: 'Mejorar la dieta en general funciona mejor que las dietas de eliminación estrictas',
        content: 'Un ensayo de 2024 mostró que una dieta general más saludable superó a la dieta de eliminación (quitar colorantes, aditivos, etc.) en la mayoría de los chicos con TDAH estudiados. Menos restricción, más sostenible.',
        source: 'Ensayo clínico 2024 citado en revisión sobre patrones dietarios y TDAH (Dr. Lewis, 2025)',
        url: '',
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
    console.log(`\n${label}: ${items.length} artículo(s) para escribir en ${collectionRef.path}`);
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item.title}`));

    if (!confirmed) {
        return;
    }

    const batch = db.batch();
    items.forEach((item) => {
        const docRef = collectionRef.doc();
        batch.set(docRef, item);
    });
    await batch.commit();
    console.log(`  -> ${items.length} documento(s) escrito(s) en ${label}.`);
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
