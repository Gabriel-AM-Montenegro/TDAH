// Script de mantenimiento: borra las cuentas anónimas (de prueba) de Firebase Auth.
//
// Uso:
//   1. npm install firebase-admin   (en esta misma carpeta o en una carpeta aparte)
//   2. Descargar una clave de servicio: Firebase Console > Configuración del proyecto >
//      Cuentas de servicio > Generar nueva clave privada. NO commitear ese .json.
//   3. Modo simulación (no borra nada, solo muestra cuántas cuentas encontraría):
//        node delete-anonymous-users.js ./service-account.json
//   4. Modo real (borra de verdad):
//        node delete-anonymous-users.js ./service-account.json --confirm

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const serviceAccountPath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!serviceAccountPath) {
    console.error('Uso: node delete-anonymous-users.js <ruta-a-service-account.json> [--confirm]');
    process.exit(1);
}

const serviceAccount = require(require('path').resolve(serviceAccountPath));

const app = initializeApp({
    credential: cert(serviceAccount),
});
const auth = getAuth(app);

const isAnonymous = (user) => user.providerData.length === 0 && !user.email;

async function collectAnonymousUsers() {
    const anonymousUids = [];
    let nextPageToken;

    do {
        const result = await auth.listUsers(1000, nextPageToken);
        result.users.forEach((user) => {
            if (isAnonymous(user)) anonymousUids.push(user.uid);
        });
        nextPageToken = result.pageToken;
    } while (nextPageToken);

    return anonymousUids;
}

async function main() {
    console.log('Buscando cuentas anónimas...');
    const anonymousUids = await collectAnonymousUsers();
    console.log(`Encontradas ${anonymousUids.length} cuentas anónimas (sin email).`);

    if (!confirmed) {
        console.log('\nModo simulación: no se borró nada.');
        console.log('Para borrarlas de verdad, corré de nuevo agregando --confirm al final.');
        return;
    }

    console.log('\nBorrando...');
    let deleted = 0;
    // deleteUsers acepta como máximo 1000 uids por llamada.
    for (let i = 0; i < anonymousUids.length; i += 1000) {
        const batch = anonymousUids.slice(i, i + 1000);
        const result = await auth.deleteUsers(batch);
        deleted += result.successCount;
        if (result.failureCount > 0) {
            console.error(`  ${result.failureCount} fallos en este lote:`);
            result.errors.forEach((e) => console.error(`    uid ${batch[e.index]}: ${e.error.message}`));
        }
    }
    console.log(`\nListo. ${deleted} cuentas anónimas borradas.`);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
