# Notifications Service

Servicio de notificaciones con Cloud Functions y Pub/Sub.

## Endpoints

- `POST /send` - Enviar notificación (requiere autenticación)
  ```json
  {
    "userId": "USER_ID",
    "type": "email",
    "title": "Order Confirmed",
    "message": "Your order has been confirmed."
  }
  ```
- `GET /user/:userId` - Obtener notificaciones de un usuario (requiere autenticación)

## Cloud Functions

- `processNotification` - Procesa notificaciones desde Pub/Sub
- `onOrderCreated` - Trigger que envía notificación cuando se crea una orden

## Ejecutar localmente

```bash
npm install
npm run build
npm run serve
```

## Ejemplo de uso

```bash
# Enviar notificación
curl -X POST http://localhost:5001/ecommerce-demo/us-central1/notificationsService/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","type":"email","title":"Test","message":"Test message"}'
```

## Tests

```bash
npm test
```

