# Reports Service

Servicio de reportes y análisis.

## Endpoints

- `POST /sales` - Generar reporte de ventas (solo admin)
  ```json
  {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  }
  ```
- `POST /inventory` - Generar reporte de inventario (solo admin)
- `POST /products` - Generar reporte de productos (solo admin)
- `GET /:reportId` - Obtener reporte por ID (solo admin)
- `GET /` - Listar reportes (solo admin)
  - Query params: `type`, `limit`

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Generar reporte de ventas
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/reportsService/sales \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-01-01T00:00:00Z","endDate":"2024-01-31T23:59:59Z"}'
```

## Tests

```bash
npm test
```

