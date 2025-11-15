// Script completo para poblar la base de datos con usuarios y productos
const admin = require('firebase-admin');

// Configure emulator settings
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'vendeloya-2e40d'
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Function to wait for emulator to be ready
function waitForEmulator(maxAttempts = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkConnection = async () => {
      attempts++;
      try {
        await auth.listUsers(1);
        console.log('✅ Emulators connected\n');
        resolve();
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error('\n❌ Error: Emulators are not running.');
          console.error('   Por favor ejecuta primero: npm start');
          console.error('   Y espera a ver: "All emulators ready!"');
          process.exit(1);
        }
        process.stdout.write(`⏳ Esperando emuladores... (${attempts}/${maxAttempts})\r`);
        setTimeout(checkConnection, delay);
      }
    };
    
    checkConnection();
  });
}

const sampleProducts = [
  {
    name: 'Laptop Gaming',
    description: 'Laptop de alto rendimiento para gaming con tarjeta gráfica dedicada',
    price: 1299.99,
    category: 'Electronics',
    stock: 10,
    sku: 'LAP-001',
    imageUrl: ''
  },
  {
    name: 'Smartphone Pro',
    description: 'Último modelo con cámara avanzada y pantalla AMOLED',
    price: 899.99,
    category: 'Electronics',
    stock: 15,
    sku: 'PHN-001',
    imageUrl: ''
  },
  {
    name: 'Auriculares Bluetooth',
    description: 'Auriculares inalámbricos con cancelación de ruido activa',
    price: 149.99,
    category: 'Audio',
    stock: 25,
    sku: 'AUD-001',
    imageUrl: ''
  },
  {
    name: 'Tablet 10 pulgadas',
    description: 'Tablet perfecta para trabajo y entretenimiento',
    price: 399.99,
    category: 'Electronics',
    stock: 8,
    sku: 'TAB-001',
    imageUrl: ''
  },
  {
    name: 'Smartwatch',
    description: 'Reloj inteligente que monitorea tu salud y actividad física',
    price: 249.99,
    category: 'Wearables',
    stock: 20,
    sku: 'WAT-001',
    imageUrl: ''
  },
  {
    name: 'Cámara Digital',
    description: 'Cámara profesional para capturar momentos perfectos',
    price: 599.99,
    category: 'Electronics',
    stock: 12,
    sku: 'CAM-001',
    imageUrl: ''
  },
  {
    name: 'Teclado Mecánico',
    description: 'Teclado gaming con switches mecánicos RGB',
    price: 129.99,
    category: 'Electronics',
    stock: 18,
    sku: 'KEY-001',
    imageUrl: ''
  },
  {
    name: 'Mouse Inalámbrico',
    description: 'Mouse ergonómico con sensor de alta precisión',
    price: 79.99,
    category: 'Electronics',
    stock: 22,
    sku: 'MOU-001',
    imageUrl: ''
  }
];

async function seedDatabase() {
  console.log('🌱 Poblando base de datos con datos iniciales...\n');
  console.log('🔍 Verificando conexión con emuladores...');
  
  await waitForEmulator();

  try {
    // ===== CREAR USUARIOS =====
    console.log('\n👥 Creando usuarios...\n');
    
    // Admin user
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail('admin@vendeloya.com');
      console.log('   ✅ Usuario admin ya existe:', adminUser.uid);
    } catch (error) {
      adminUser = await auth.createUser({
        email: 'admin@vendeloya.com',
        password: 'admin123',
        displayName: 'Administrador'
      });
      console.log('   ✅ Usuario admin creado:', adminUser.uid);
    }

    // Set admin role
    await auth.setCustomUserClaims(adminUser.uid, { role: 'admin' });
    console.log('   ✅ Rol admin asignado');

    // Create admin profile in Firestore
    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: 'admin@vendeloya.com',
      displayName: 'Administrador',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('   ✅ Perfil admin creado en Firestore');

    // Regular user
    let regularUser;
    try {
      regularUser = await auth.getUserByEmail('danuel@vendeloya.com');
      console.log('   ✅ Usuario regular ya existe:', regularUser.uid);
    } catch (error) {
      regularUser = await auth.createUser({
        email: 'danuel@vendeloya.com',
        password: 'test123',
        displayName: 'Danuel Ezequiel Cuevas'
      });
      console.log('   ✅ Usuario regular creado:', regularUser.uid);
    }

    // Set user role
    await auth.setCustomUserClaims(regularUser.uid, { role: 'user' });
    console.log('   ✅ Rol user asignado');

    // Create user profile in Firestore
    await db.collection('users').doc(regularUser.uid).set({
      uid: regularUser.uid,
      email: 'danuel@vendeloya.com',
      displayName: 'Danuel Ezequiel Cuevas',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('   ✅ Perfil usuario creado en Firestore');

    // ===== CREAR PRODUCTOS =====
    console.log('\n📦 Creando productos...\n');
    
    const productsRef = db.collection('products');
    let createdCount = 0;
    let existingCount = 0;

    for (const product of sampleProducts) {
      try {
        // Check if product with same SKU exists
        const existingQuery = await productsRef.where('sku', '==', product.sku).get();
        
        if (!existingQuery.empty) {
          console.log(`   ⏭️  Producto "${product.name}" ya existe (SKU: ${product.sku})`);
          existingCount++;
          continue;
        }

        const productData = {
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await productsRef.add(productData);
        console.log(`   ✅ Producto creado: "${product.name}" ($${product.price})`);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error creando producto "${product.name}":`, error.message);
      }
    }

    // ===== RESUMEN =====
    console.log('\n' + '='.repeat(50));
    console.log('✅ Base de datos poblada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   👥 Usuarios: 2 (1 admin, 1 regular)`);
    console.log(`   📦 Productos: ${createdCount} creados, ${existingCount} ya existían`);
    console.log('\n🔑 Credenciales:');
    console.log('   👨‍💼 Admin:');
    console.log('      Email: admin@vendeloya.com');
    console.log('      Password: admin123');
    console.log('   👤 Usuario:');
    console.log('      Email: danuel@vendeloya.com');
    console.log('      Password: test123');
    console.log('\n🌐 Abre: http://localhost:5000');
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solución:');
      console.error('   1. Abre otra terminal');
      console.error('   2. Ejecuta: npm start');
      console.error('   3. Espera a ver: "All emulators ready!"');
      console.error('   4. Luego ejecuta este script de nuevo');
    }
    process.exit(1);
  }
}

seedDatabase();




