// Script to setup database with users and admin role
const admin = require('firebase-admin');

// Initialize Firebase Admin with emulator settings
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
        console.log('Emulators connected\n');
        resolve();
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error('\nError: Emulators are not running.');
          console.error('   Please run first: npm start');
          console.error('   And wait to see: "All emulators ready!"');
          process.exit(1);
        }
        process.stdout.write(`Waiting for emulators... (${attempts}/${maxAttempts})\r`);
        setTimeout(checkConnection, delay);
      }
    };
    
    checkConnection();
  });
}

async function setupDatabase() {
  console.log('Setting up database...\n');
  console.log('Verifying emulator connection...');
  
  await waitForEmulator();

  try {
    // Create admin user if doesn't exist
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail('admin@vendeloya.com');
      console.log('Admin user already exists:', adminUser.uid);
    } catch (error) {
      adminUser = await auth.createUser({
        email: 'admin@vendeloya.com',
        password: 'admin123',
        displayName: 'Administrador'
      });
      console.log('Admin user created:', adminUser.uid);
    }

    // Set admin role
    await auth.setCustomUserClaims(adminUser.uid, { role: 'admin' });
    console.log('Admin role assigned');

    // Create/update admin profile in Firestore
    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: 'admin@vendeloya.com',
      displayName: 'Administrador',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('Admin profile created in Firestore');

    // Create regular user if doesn't exist
    let regularUser;
    try {
      regularUser = await auth.getUserByEmail('danuel@vendeloya.com');
      console.log('Regular user already exists:', regularUser.uid);
    } catch (error) {
      regularUser = await auth.createUser({
        email: 'danuel@vendeloya.com',
        password: 'test123',
        displayName: 'Danuel Ezequiel Cuevas'
      });
      console.log('Regular user created:', regularUser.uid);
    }

    // Set user role
    await auth.setCustomUserClaims(regularUser.uid, { role: 'user' });
    console.log('User role assigned');

    // Create/update user profile in Firestore
    await db.collection('users').doc(regularUser.uid).set({
      uid: regularUser.uid,
      email: 'danuel@vendeloya.com',
      displayName: 'Danuel Ezequiel Cuevas',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('User profile created in Firestore');

    console.log('\nDatabase configured successfully!');
    console.log('\nCredentials:');
    console.log('   Admin:');
    console.log('   - Email: admin@vendeloya.com');
    console.log('   - Password: admin123');
    console.log('   - UID:', adminUser.uid);
    console.log('\n   User:');
    console.log('   - Email: danuel@vendeloya.com');
    console.log('   - Password: test123');
    console.log('   - UID:', regularUser.uid);
    console.log('\nOpen: http://127.0.0.1:5000');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nSolution:');
      console.error('   1. Open another terminal');
      console.error('   2. Run: npm start');
      console.error('   3. Wait to see: "All emulators ready!"');
      console.error('   4. Then run this script again');
    }
    process.exit(1);
  }
}

setupDatabase();
