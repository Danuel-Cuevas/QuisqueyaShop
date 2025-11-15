# Inventory Service

Servicio de gestión de inventario.

## Endpoints

- `GET /product/:productId` - Obtener inventario de un producto
- `GET /products` - Obtener todo el inventario
- `PUT /product/:productId` - Actualizar inventario (solo admin)
  ```json
  {
    "quantity": 100,
    "lowStockThreshold": 20
  }
  ```
- `POST /reserve` - Reservar inventario
  ```json
  {
    "productId": "PRODUCT_ID",
    "quantity": 5
  }
  ```
- `POST /release` - Liberar inventario reservado
  ```json
  {
    "productId": "PRODUCT_ID",
    "quantity": 5
  }
  ```
- `POST /consume` - Consumir inventario (reducir cantidad y reservado)
  ```json
  {
    "productId": "PRODUCT_ID",
    "quantity": 5
  }
  ```
- `GET /low-stock` - Obtener productos con stock bajo

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Obtener inventario
curl http://localhost:5001/ecommerce-demo/us-central1/inventoryService/product/PRODUCT_ID

# Actualizar inventario (requiere admin)
curl -X PUT http://localhost:5001/ecommerce-demo/us-central1/inventoryService/product/PRODUCT_ID \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity":100,"lowStockThreshold":20}'
```

## Tests

```bash
npm test
```

