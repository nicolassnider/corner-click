# Configuración de Administradores

## Colección `admins` en Firestore

Para que un usuario pueda acceder al panel de administración, debe estar registrado en la colección `admins` de Firestore.

### Estructura del documento

```text
admins/
  {uid}/
    email: string
    createdAt: string (ISO timestamp)
    role: string (opcional, default: "admin")
```

### Cómo registrar el primer administrador

#### Método 1: Vía Firebase Console (Recomendado)

1. Ve a la [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Navega a **Authentication** > **Users**
4. Crea un nuevo usuario con email y contraseña
5. Copia el **UID** del usuario creado
6. Navega a **Firestore Database**
7. Crea un nuevo documento en la colección `admins`:
   - **ID del documento**: El UID del usuario (copiado en paso 5)
   - **Campos**:

     ```json
     {
       "email": "admin@cornerclick.com",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "role": "admin"
     }
     ```

#### Método 2: Vía Firebase CLI

```bash
# 1. Crea el usuario en Authentication
firebase auth:import users.json --hash-algo=SCRYPT

# 2. Agrega el documento en Firestore
firebase firestore:add admins/{uid} email="admin@cornerclick.com" createdAt="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" role="admin"
```

#### Método 3: Vía Script de Node.js

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdmin(uid, email) {
  await db.collection('admins').doc(uid).set({
    email,
    createdAt: new Date().toISOString(),
    role: 'admin'
  });
  console.log(`Admin creado con UID: ${uid}`);
}

// Usar después de crear el usuario en Authentication
createAdmin('USER_UID_HERE', 'admin@cornerclick.com');
```

## Verificación de Admin

El middleware `requireAdmin` en la API verifica que:

1. El token de Firebase Auth sea válido
2. El UID del usuario exista en la colección `admins`

## Seguridad

- Nunca compartas las credenciales del administrador
- Usa contraseñas fuertes (mínimo 8 caracteres, con mayúsculas, minúsculas y números)
- Considera habilitar la autenticación de dos factores (2FA) en Firebase Console
- Revisa regularmente la lista de administradores en Firestore
- Revoca el acceso eliminando el documento de `admins` cuando sea necesario
