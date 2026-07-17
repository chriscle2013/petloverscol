import { db } from './firebase.js';

/**
 * SCRIPT TEMPORAL PARA MIGRAR PRODUCTOS
 * Ejecuta esta función una sola vez en la consola para subir los datos
 */
async function migrateProductsToFirebase(products) {
    console.log("🚀 Iniciando migración de productos a Firebase...");
    const productsCol = collection(db, 'products');

    for (const [id, data] of Object.entries(products)) {
        try {
            await setDoc(doc(productsCol, id), {
                ...data,
                stock: 10, // Stock inicial por defecto
                updatedAt: new Date()
            });
            console.log(`✅ Producto ${id} subido con éxito.`);
        } catch (e) {
            console.error(`❌ Error subiendo ${id}:`, e);
        }
    }
    console.log("✨ Migración completada.");
}

export { db, migrateProductsToFirebase };
