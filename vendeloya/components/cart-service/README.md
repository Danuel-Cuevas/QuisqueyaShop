# Cart Service

Servicio de carrito de compras.

## Endpoints

- `GET /user/:userId` - Obtener carrito del usuario (requiere autenticación)
- `POST /user/:userId/items` - Agregar item al carrito (requiere autenticación)
  ```json
  {
    "productId": "PRODUCT_ID",
    "quantity": 2
  }
  ```
- `PUT /user/:userId/items/:productId` - Actualizar cantidad de item (requiere autenticación)
  ```json
  {
    "quantity": 3
  }
  ```
- `DELETE /user/:userId/items/:productId` - Eliminar item del carrito (requiere autenticación)
- `DELETE /user/:userId` - Limpiar carrito (requiere autenticación)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Obtener carrito
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/ecommerce-demo/us-central1/cartService/user/USER_ID

# Agregar item
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/cartService/user/USER_ID/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":2}'
```

## Tests

```bash
npm test
```

