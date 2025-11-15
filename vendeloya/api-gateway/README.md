# API Gateway

API Gateway que enruta las peticiones a los diferentes microservicios.

## Endpoints

- `GET /health` - Health check
- `/users/*` - Rutas del servicio de usuarios (requiere autenticación)
- `/catalog/*` - Rutas del catálogo de productos
- `/cart/*` - Rutas del carrito (requiere autenticación)
- `/orders/*` - Rutas de órdenes (requiere autenticación)
- `/payments/*` - Rutas de pagos (requiere autenticación)
- `/inventory/*` - Rutas de inventario
- `/billing/*` - Rutas de facturación (requiere autenticación)
- `/notifications/*` - Rutas de notificaciones (requiere autenticación)
- `/audit/*` - Rutas de auditoría (requiere autenticación)
- `/reports/*` - Rutas de reportes (requiere autenticación)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Health check
curl http://localhost:5001/ecommerce-demo/us-central1/apiGateway/health

# Obtener productos (sin autenticación)
curl http://localhost:5001/ecommerce-demo/us-central1/apiGateway/catalog/products

# Obtener carrito (con autenticación)
curl -H "Authorization: Bearer <token>" http://localhost:5001/ecommerce-demo/us-central1/apiGateway/cart/user/123
```

