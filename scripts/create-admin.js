/**
 * Script para crear un usuario administrador en el emulador local
 * 
 * Uso: node scripts/create-admin.js [email] [password] [displayName]
 * 
 * Ejemplo:
 *   node scripts/create-admin.js admin@example.com admin123 "Administrador"
 */

const email = process.argv[2] || 'admin@vendeloya.com';
const password = process.argv[3] || 'admin123';
const displayName = process.argv[4] || 'Administrador';

const AUTH_BASE = 'http://127.0.0.1:5001/vendeloya-2e40d/us-central1/usersService';

async function createAdmin() {
    console.log('🔐 Creando usuario administrador...');
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${displayName}`);
    console.log(`   Contraseña: ${password}`);
    console.log('');

    try {
        const response = await fetch(`${AUTH_BASE}/create-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                displayName
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Usuario administrador creado exitosamente!');
            console.log('');
            console.log('📋 Credenciales:');
            console.log(`   Email: ${data.email}`);
            console.log(`   Contraseña: ${password}`);
            console.log(`   Rol: ${data.role}`);
            console.log('');
            console.log('🚀 Ahora puedes iniciar sesión en la aplicación con estas credenciales.');
        } else {
            console.error('❌ Error al crear usuario administrador:');
            console.error(`   ${data.error || 'Error desconocido'}`);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error de conexión:');
        console.error(`   ${error.message}`);
        console.error('');
        console.error('💡 Asegúrate de que:');
        console.error('   1. Los emuladores de Firebase estén corriendo (npm start)');
        console.error('   2. El servicio de usuarios esté desplegado');
        console.error('   3. Estés en el directorio raíz del proyecto');
        process.exit(1);
    }
}

createAdmin();

