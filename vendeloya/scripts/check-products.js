// Script para verificar productos en Firestore
const admin = require('firebase-admin');

// Configure emulator settings
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'vendeloya-2e40d'
});

const db = admin.firestore();

async function checkProducts() {
  try {
    console.log('🔍 Verificando productos en Firestore...\n');
    
    const snapshot = await db.collection('products').get();
    
    console.log(`📊 Total de productos encontrados: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('⚠️  No hay productos en la base de datos.');
      console.log('💡 Para crear productos, inicia sesión como admin en la aplicación.');
      return;
    }
    
    console.log('✅ Productos encontrados:\n');
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || 'Sin nombre'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Precio: $${data.price || '0.00'}`);
      console.log(`   Categoría: ${data.category || 'N/A'}`);
      console.log(`   Stock: ${data.stock || 0}`);
      console.log('');
    });
    
    console.log('✅ Verificación completada.');
  } catch (error) {
    console.error('❌ Error al verificar productos:', error);
    console.error('\n💡 Asegúrate de que los emuladores de Firebase estén corriendo:');
    console.error('   npm start');
  } finally {
    process.exit(0);
  }
}

checkProducts();




