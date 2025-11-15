# Orders Service

Servicio de gestión de órdenes.

## Endpoints

- `POST /create` - Crear orden desde carrito (requiere autenticación)
  ```json
  {
    "cartId": "CART_ID",
    "shippingAddress": {}
  }
  ```
- `GET /:orderId` - Obtener orden por ID (requiere autenticación)
- `GET /user/:userId` - Obtener órdenes de un usuario (requiere autenticación)
- `PUT /:orderId/status` - Actualizar estado de orden (solo admin)
  ```json
  {
    "status": "confirmed"
  }
  ```

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

