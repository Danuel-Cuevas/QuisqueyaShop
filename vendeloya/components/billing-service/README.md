# Billing Service

Servicio de facturación.

## Endpoints

- `POST /generate` - Generar factura desde una orden (requiere autenticación)
  ```json
  {
    "orderId": "ORDER_ID"
  }
  ```
- `POST /:invoiceId/issue` - Emitir factura (solo admin)
- `POST /:invoiceId/pay` - Marcar factura como pagada (requiere autenticación)
- `GET /:invoiceId` - Obtener factura por ID (requiere autenticación)
- `GET /user/:userId` - Obtener facturas de un usuario (requiere autenticación)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Generar factura
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/billingService/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID"}'

# Obtener factura
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/ecommerce-demo/us-central1/billingService/INVOICE_ID
```

## Tests

```bash
npm test
```

