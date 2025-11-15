# QuisqueyaShop - Plataforma E-commerce Completa

## Descripción General

**QuisqueyaShop** es una plataforma de comercio electrónico completa desarrollada con arquitectura de microservicios. La aplicación permite a los usuarios navegar por un catálogo de productos, gestionar carritos de compras, realizar pedidos y administrar su perfil, mientras que los administradores tienen acceso a un panel completo para gestionar productos, usuarios, pedidos y generar reportes detallados.

## Características Principales

### Para Usuarios
- **Catálogo de Productos**: Navegación y búsqueda de productos con imágenes, descripciones y precios
- **Carrito de Compras**: Gestión completa del carrito con sincronización en tiempo real
- **Gestión de Pedidos**: Visualización del historial de pedidos con estados y detalles
- **Perfil de Usuario**: Edición de información personal y foto de perfil
- **Autenticación Segura**: Sistema de registro e inicio de sesión con Firebase Auth

### Para Administradores
- **Gestión de Productos**: CRUD completo de productos con imágenes
- **Gestión de Usuarios**: Visualización y administración de usuarios y roles
- **Gestión de Pedidos**: Visualización de todos los pedidos, cancelación y actualización de estados
- **Sistema de Reportes**: Generación de reportes de ventas, inventario y productos
- **Configuración**: Personalización del logo de la aplicación

## Arquitectura Técnica

### Arquitectura de Microservicios
El proyecto está construido con una arquitectura de microservicios escalable que incluye:

1. **API Gateway**: Punto de entrada único que enruta todas las peticiones
2. **Users Service**: Gestión de usuarios, autenticación y perfiles
3. **Catalog Service**: Catálogo y gestión de productos
4. **Cart Service**: Gestión de carritos de compras
5. **Orders Service**: Procesamiento y gestión de órdenes
6. **Payments Service**: Procesamiento de pagos (simulado)
7. **Inventory Service**: Control de inventario
8. **Billing Service**: Facturación
9. **Notifications Service**: Sistema de notificaciones
10. **Audit Service**: Auditoría y logging
11. **Reports Service**: Generación de reportes y análisis

### Stack Tecnológico

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Diseño responsive y moderno
- Interfaz de usuario intuitiva

**Backend:**
- Node.js 18+
- TypeScript
- Express.js
- Firebase Cloud Functions v2

**Base de Datos y Servicios:**
- Firebase Firestore (Base de datos NoSQL)
- Firebase Authentication (Autenticación)
- Firebase Storage (Almacenamiento de imágenes)
- Firebase Hosting (Hosting estático)
- Firebase Pub/Sub (Comunicación asíncrona)

**Herramientas:**
- Jest (Testing)
- ESLint (Linting)
- TypeScript (Type safety)

## Funcionalidades Destacadas

### Seguridad
- Autenticación JWT con Firebase Auth
- Sistema de roles (usuario/admin) con custom claims
- Reglas de seguridad en Firestore y Storage
- Validación de tokens en todos los endpoints protegidos

### Experiencia de Usuario
- Interfaz responsive que se adapta a diferentes dispositivos
- Notificaciones toast para feedback inmediato
- Carga asíncrona de datos
- Manejo de errores robusto
- Carrito persistente en localStorage

### Administración
- Panel de administración completo con pestañas organizadas
- Generación de reportes con filtros de fecha
- Gestión visual de productos con imágenes
- Control de estados de pedidos
- Personalización de la aplicación (logo)

## Desarrollo y Despliegue

### Desarrollo Local
El proyecto utiliza Firebase Emulators para desarrollo local, permitiendo:
- Desarrollo sin necesidad de conexión a servicios en la nube
- Testing completo de todas las funcionalidades
- Debugging facilitado
- Configuración rápida con scripts automatizados

### Escalabilidad
La arquitectura de microservicios permite:
- Escalamiento independiente de cada servicio
- Desarrollo y despliegue independiente
- Fácil mantenimiento y actualización
- Alta disponibilidad

## Casos de Uso

1. **E-commerce B2C**: Tienda en línea para venta directa al consumidor
2. **Marketplace**: Base para construir un marketplace multi-vendedor
3. **Gestión de Inventario**: Sistema completo de gestión de productos e inventario
4. **Análisis de Ventas**: Reportes detallados para toma de decisiones

## Estado del Proyecto

✅ **Completado:**
- Autenticación y autorización
- CRUD completo de productos
- Sistema de carrito de compras
- Gestión de pedidos
- Panel de administración
- Sistema de reportes
- Gestión de perfiles de usuario
- Subida de imágenes

🚀 **Listo para Producción:**
- Código limpio y profesional
- Sin emojis ni elementos innecesarios
- Documentación completa
- Testing implementado
- Configuración de seguridad

## Requisitos del Sistema

- Node.js 18 o superior
- npm o yarn
- Firebase CLI
- Navegador web moderno

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar base de datos
npm run init

# Iniciar aplicación
npm start
```

La aplicación estará disponible en `http://localhost:5000` y el panel de Firebase Emulators en `http://localhost:4000`.

---

**QuisqueyaShop** - Una solución completa de e-commerce construida con las mejores prácticas de desarrollo moderno.

