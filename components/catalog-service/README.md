# Catalog Service

Servicio de catálogo de productos.

## Endpoints

- `GET /products` - Listar todos los productos
  - Query params: `category`, `limit`, `offset`
- `GET /products/:id` - Obtener producto por ID
- `POST /products` - Crear producto (solo admin)
  ```json
  {
    "name": "Product Name",
    "description": "Product Description",
    "price": 99.99,
    "category": "Electronics",
    "sku": "SKU-001",
    "stock": 10,
    "imageUrl": "https://example.com/image.jpg"
  }
  ```
- `PUT /products/:id` - Actualizar producto (solo admin)
- `DELETE /products/:id` - Eliminar producto (solo admin)
- `GET /categories/:category/products` - Obtener productos por categoría

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Obtener todos los productos
curl http://localhost:5001/ecommerce-demo/us-central1/catalogService/products

# Obtener producto por ID
curl http://localhost:5001/ecommerce-demo/us-central1/catalogService/products/PRODUCT_ID

# Crear producto (requiere admin)
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/catalogService/products \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","description":"High performance laptop","price":1299.99,"category":"Electronics","sku":"LAP-001","stock":5}'
```

## Tests

```bash
npm test
```

