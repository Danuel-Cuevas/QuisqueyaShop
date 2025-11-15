# Payments Service

Servicio de procesamiento de pagos.

## Endpoints

- `POST /process` - Procesar pago (requiere autenticación)
  ```json
  {
    "orderId": "ORDER_ID",
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "credit_card"
  }
  ```
- `GET /:paymentId` - Obtener pago por ID (requiere autenticación)
- `GET /order/:orderId` - Obtener pagos de una orden (requiere autenticación)
- `POST /:paymentId/refund` - Reembolsar pago (solo admin)

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Procesar pago
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/paymentsService/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID","amount":99.99,"currency":"USD","paymentMethod":"credit_card"}'

# Obtener pago
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/ecommerce-demo/us-central1/paymentsService/PAYMENT_ID
```

## Tests

```bash
npm test
```

