# Admin Credentials

## Admin User

```
Email: admin@vendeloya.com
Password: admin123
Name: Administrador
Role: admin
```

## Regular User

```
Email: danuel@vendeloya.com
Password: test123
Name: Danuel Ezequiel Cuevas
Role: user
```

## Setup Database

Run the setup script:

```bash
npm run init
```

Or directly:

```bash
node scripts/setup-database.js
```

This script:
- Creates users in Firebase Auth
- Assigns correct roles (admin/user)
- Creates profiles in Firestore
- Configures everything automatically

## Verify Setup

After running the setup script:

1. Login with: `admin@vendeloya.com` / `admin123`
2. You should have access to admin functions:
   - View all users
   - Create/edit products
   - View reports
   - View audit logs
   - Manage inventory
