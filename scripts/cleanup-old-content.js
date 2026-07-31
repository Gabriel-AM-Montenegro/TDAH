// Script de mantenimiento: borra los artículos VIEJOS de Blog y Nutrición,
// dejando solo los que coinciden con los títulos "nuevos" definidos abajo
// (los mismos que carga seed-content.js).
//
// Uso (en la carpeta scripts/, ya tiene firebase-admin instalado):
//   1. Modo simulación (no borra nada, solo muestra qué borraría):
//        node cleanup-old-content.js ./service-account.json
//   2. Modo real (borra de verdad):
//        node cleanup-old-content.js ./service-account.json --confirm

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountPath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!serviceAccountPath) {
    console.error('Uso: node cleanup-old-content.js <ruta-a-service-account.json> [--confirm]');
    process.exit(1);
}

const serviceAccount = require(require('path').resolve(serviceAccountPath));

const app = initializeApp({
    credential: cert(serviceAccount),
});
const db = getFirestore(app);

const PUBLIC_DATA_DOC_ID = '1:765424031369:web:838eca686f68f21daa5858';

// Deben coincidir exactamente con los títulos de seed-content.js.
const blogTitlesToKeep = new Set([
    '"Ceguera del tiempo": por qué el reloj no funciona igual en el TDAH',
    'El ejercicio como "medicación extra": qué dice la evidencia',
    'Por qué cuesta tanto "apagar la cabeza" a la noche',
    'La vergüenza no es una estrategia (y la autocompasión sí ayuda)',
    '¿Sirven de verdad las apps con puntos y recompensas?',
]);

const nutricionTitlesToKeep = new Set([
    'Omega-3: ayuda, pero no es magia',
    'Ultraprocesados: la asociación es real, la causa todavía se está estudiando',
    'Los déficits que más aparecen en TDAH: hierro, zinc, magnesio y vitaminas B',
    'Mejorar la dieta en general funciona mejor que las dietas de eliminación estrictas',
]);

async function cleanupCollection(collectionRef, titlesToKeep, label) {
    const snapshot = await collectionRef.get();
    const toDelete = snapshot.docs.filter(doc => !titlesToKeep.has(doc.data().title));
    const toKeepCount = snapshot.size - toDelete.length;

    console.log(`\n${label}: ${snapshot.size} documento(s) en total, ${toKeepCount} coinciden con la lista nueva, ${toDelete.length} se borrarían:`);
    toDelete.forEach((doc, i) => console.log(`  ${i + 1}. [${doc.id}] ${doc.data().title}`));

    if (!confirmed || !toDelete.length) return;

    const batch = db.batch();
    toDelete.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  -> ${toDelete.length} documento(s) borrado(s) en ${label}.`);
}

async function main() {
    const blogCollectionRef = db.collection('artifacts').doc(PUBLIC_DATA_DOC_ID).collection('blogArticles');
    const nutricionCollectionRef = db
        .collection('artifacts')
        .doc(PUBLIC_DATA_DOC_ID)
        .collection('public')
        .doc('data')
        .collection('nutritionContent');

    await cleanupCollection(blogCollectionRef, blogTitlesToKeep, 'Blog');
    await cleanupCollection(nutricionCollectionRef, nutricionTitlesToKeep, 'Nutrición');

    if (!confirmed) {
        console.log('\nModo simulación: no se borró nada.');
        console.log('Para borrar de verdad, corré de nuevo agregando --confirm al final.');
    } else {
        console.log('\nListo.');
    }
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
