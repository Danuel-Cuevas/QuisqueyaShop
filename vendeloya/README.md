# E-commerce Microservices Architecture

Arquitectura de microservicios para E-commerce implementada con Node.js, TypeScript y Firebase.

## Arquitectura

La solución está compuesta por 10 microservicios:

1. **API Gateway** - Punto de entrada único para todas las peticiones
2. **Users Service** - Gestión de usuarios y autenticación
3. **Catalog Service** - Catálogo de productos
4. **Cart Service** - Carrito de compras
5. **Orders Service** - Gestión de órdenes
6. **Payments Service** - Procesamiento de pagos
7. **Inventory Service** - Gestión de inventario
8. **Billing Service** - Facturación
9. **Notifications Service** - Notificaciones (email, SMS, push)
10. **Audit Service** - Auditoría y logging
11. **Reports Service** - Reportes y análisis

## Stack Tecnológico

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Platform**: Firebase (Cloud Functions v2, Firestore, Auth, Storage, Pub/Sub, Hosting)
- **Testing**: Jest
- **API Documentation**: OpenAPI/Swagger

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta de Firebase (para producción) o usar emuladores locales

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd IA_program
```

2. Instalar dependencias:
```bash
npm install
```

3. Construir todos los servicios:
```bash
npm run build
```

## Inicio Rápido

### Opción 1: Inicio Automático (Recomendado)

```bash
npm run start:local
```

Este comando verifica todo, limpia puertos, construye servicios e inicia emuladores.

### Opción 2: Inicio Manual

```bash
# 1. Detener procesos anteriores (si es necesario)
npm run stop

# 2. Construir servicios
npm run build

# 3. Iniciar emuladores
npm start

# 4. En otra terminal, poblar base de datos
npm run seed
```

### URLs Importantes

- **Aplicación**: http://localhost:5000
- **Firebase UI**: http://localhost:4000
- **API Gateway**: http://localhost:5001/vendeloya-2e40d/us-central1/apiGateway

### Credenciales de Prueba

**Admin:**
- Email: `admin@vendeloya.com`
- Password: `admin123`

**Usuario:**
- Email: `danuel@vendeloya.com`
- Password: `test123`

## Estructura del Proyecto

```
.
├── api-gateway/          # API Gateway
├── components/           # Microservicios
│   ├── users-service/
│   ├── catalog-service/
│   ├── cart-service/
│   ├── orders-service/
│   ├── payments-service/
│   ├── inventory-service/
│   ├── billing-service/
│   ├── notifications-service/
│   ├── audit-service/
│   └── reports-service/
├── config/               # Configuraciones Firebase
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── scripts/              # Scripts de utilidad
│   ├── build-all.sh
│   ├── start-local.ps1
│   ├── stop.ps1
│   ├── seed-database.js
│   └── check-products.js
├── diagram.puml          # Diagrama de componentes
├── openapi.yaml          # Especificación OpenAPI
├── firebase.json         # Configuración Firebase
└── README.md
```

## Endpoints Principales

### API Gateway
- `GET /health` - Health check
- `GET /catalog/products` - Listar productos
- `GET /cart/user/:userId` - Obtener carrito (requiere auth)
- `POST /payments/process` - Procesar pago (requiere auth)
- `POST /reports/sales` - Generar reporte de ventas (requiere admin)

Ver `openapi.yaml` para documentación completa.

## Autenticación

La autenticación se realiza mediante Firebase Auth con JWT tokens.

### Registrar usuario:
```bash
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/usersService/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","displayName":"John Doe"}'
```

### Usar token en requests:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/ecommerce-demo/us-central1/apiGateway/cart/user/USER_ID
```

## Testing

Ejecutar tests de todos los servicios:

```bash
npm test
```

Ejecutar tests de un servicio específico:

```bash
cd components/users-service
npm test
```

## Despliegue

### Desplegar a Firebase:

1. Iniciar sesión en Firebase:
```bash
firebase login
```

2. Seleccionar proyecto:
```bash
firebase use <project-id>
```

3. Desplegar:
```bash
npm run deploy
# O desplegar servicios específicos
firebase deploy --only functions:api-gateway
```

## Comunicación Asíncrona

El sistema utiliza Pub/Sub para comunicación asíncrona:

- **Payments Service** publica eventos de pago procesado
- **Notifications Service** procesa notificaciones desde Pub/Sub
- **Firestore Triggers** envían notificaciones cuando se crean órdenes

## Seguridad

- Autenticación JWT con Firebase Auth
- Roles: `user` y `admin` (custom claims)
- Reglas de seguridad en Firestore y Storage
- Validación de tokens en todos los endpoints protegidos

## Observabilidad

- Logging estructurado con `firebase-functions/logger`
- Endpoint `/health` en API Gateway
- Métricas de Cloud Functions disponibles en Firebase Console

## Diagrama de Componentes

Ver `diagram.puml` para el diagrama completo. Generar PNG:

```bash
# Requiere PlantUML instalado
plantuml diagram.puml
```

## Scripts Disponibles

- `npm run start:local` - Inicio automático completo (recomendado)
- `npm start` - Iniciar emuladores de Firebase
- `npm run stop` - Detener emuladores
- `npm run build` - Construir todos los servicios
- `npm run seed` - Poblar base de datos con usuarios y productos
- `npm run check-products` - Verificar productos en la base de datos
- `npm test` - Ejecutar tests
- `npm run deploy` - Desplegar a Firebase

## Documentación Adicional

Cada servicio incluye su propio README con:
- Endpoints disponibles
- Ejemplos de uso
- Comandos para ejecutar

## Licencia

Este proyecto es una implementación técnica de referencia.

