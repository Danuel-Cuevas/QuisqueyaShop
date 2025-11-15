# Users Service

Servicio de gestión de usuarios con Firebase Auth.

## Endpoints

- `POST /register` - Registrar nuevo usuario
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe"
  }
  ```

- `GET /profile/:uid` - Obtener perfil de usuario (requiere autenticación)
- `PUT /profile/:uid` - Actualizar perfil de usuario (requiere autenticación)
  ```json
  {
    "displayName": "Updated Name"
  }
  ```

- `PUT /role/:uid` - Actualizar rol de usuario (solo admin)
  ```json
  {
    "role": "admin"
  }
  ```

- `GET /users` - Listar todos los usuarios (solo admin)
- `DELETE /:uid` - Eliminar usuario (requiere autenticación)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Registrar usuario
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/usersService/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

# Obtener perfil
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/ecommerce-demo/us-central1/usersService/profile/USER_ID
```

## Tests

```bash
npm test
```

