# Audit Service

Servicio de auditoría y logging.

## Endpoints

- `POST /log` - Crear log de auditoría
  ```json
  {
    "userId": "USER_ID",
    "action": "CREATE",
    "resource": "order",
    "resourceId": "ORDER_ID",
    "details": {},
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0"
  }
  ```
- `GET /logs` - Obtener logs de auditoría (solo admin)
  - Query params: `userId`, `resource`, `action`, `startDate`, `endDate`, `limit`
- `GET /logs/:logId` - Obtener log por ID (solo admin)
- `GET /resource/:resource/:resourceId` - Obtener logs de un recurso (solo admin)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Crear log
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/auditService/log \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","action":"CREATE","resource":"order","resourceId":"ORDER_ID"}'

# Obtener logs (requiere admin)
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5001/ecommerce-demo/us-central1/auditService/logs
```

## Tests

```bash
npm test
```

