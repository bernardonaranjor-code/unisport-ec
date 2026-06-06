# Auto-deploy a GoDaddy — Setup en 5 minutos

Este repo tiene un workflow de GitHub Actions (`.github/workflows/deploy-godaddy.yml`) que **sube automáticamente** la carpeta `public/` a tu hosting de GoDaddy cada vez que pusheás a `main`.

Para que funcione, GitHub necesita saber cómo entrar a tu FTP de GoDaddy. Eso lo configurás **una sola vez** con 4 "secrets" (secretos cifrados que viven dentro del repo, nunca expuestos en el código).

---

## Paso 1 — Conseguir tus credenciales FTP de GoDaddy

1. Entrá a tu cuenta de GoDaddy → **Mis Productos**.
2. Buscar tu plan de hosting → click en **Administrar** → te lleva a **cPanel**.
3. En cPanel, en la sección **Archivos**, click en **Cuentas FTP** (o "FTP Accounts").
4. Acordate (o crea uno nuevo) de:
   - **Servidor FTP** (ej. `ftp.unisportec.com` o `unisportec.com`).
   - **Usuario FTP** (ej. `usuario@unisportec.com` o solo `usuario`).
   - **Contraseña FTP**.
   - **Directorio destino** — ver Paso 2.

> Si no recordas tu password, en "Cuentas FTP" podés hacer click en **Cambiar contraseña** para generar una nueva.

---

## Paso 2 — Decidir el directorio destino

Depende de qué tipo de hosting tengas en GoDaddy. Tres casos:

### A) Hosting estático (Web Hosting / cPanel sin Node.js)
```
/public_html/
```
Es el caso más común. Los archivos van directo a la raíz del sitio.

### B) Hosting con Node.js activo (server.js corriendo)
Entrá al panel → **Setup Node.js App** → mirá el campo **Application root**. La ruta será algo como:
```
/home/TU_USUARIO/unisport-ec/public/
```

### C) Subdominio
Si el sitio está en un subdominio (ej. `staging.unisportec.com`):
```
/public_html/staging/
```

> Si no estás seguro, abrí FileZilla, conectá con tu FTP, y mirá dónde están los archivos viejos del sitio. Esa carpeta es la respuesta.

---

## Paso 3 — Cargar los 4 secrets en GitHub

1. Abrí el repo en GitHub: <https://github.com/bernardonaranjor-code/unisport-ec>
2. **Settings** (menú superior, a la derecha del título del repo).
3. En el menú izquierdo: **Secrets and variables** → **Actions**.
4. Click en **New repository secret**. Creá estos 4 uno por uno:

| Nombre del secret | Valor                                           |
| ----------------- | ----------------------------------------------- |
| `FTP_SERVER`      | El servidor FTP (ej. `ftp.unisportec.com`)      |
| `FTP_USERNAME`    | Tu usuario FTP                                  |
| `FTP_PASSWORD`    | Tu contraseña FTP                               |
| `FTP_SERVER_DIR`  | El directorio destino del Paso 2 (con `/` final)|

> **Importante:** Los nombres deben ser exactos. Sensibles a mayúsculas.

---

## Paso 4 — Probar el deploy

Dos formas:

### Manual (recomendado la primera vez)
1. En el repo, ve a la pestaña **Actions**.
2. En la barra izquierda, click en **Deploy to GoDaddy**.
3. Botón **Run workflow** → dejá `main` seleccionado → **Run workflow**.
4. Esperá ~1-2 minutos. Si todo salió bien, verás un check verde ✅.
5. Abrí `unisportec.com` y refrescá con `Ctrl+F5`. Deberías ver el switcher ES/EN y la nueva card del Mundial 2026.

### Automático (de aquí en adelante)
Cada vez que pusheés un cambio en `public/`, el workflow corre solo. No tenes que hacer nada más que `git push`.

---

## ¿Qué hace exactamente el workflow?

Mira `.github/workflows/deploy-godaddy.yml`. En resumen:

- Se dispara con push a `main` (solo si cambia algo en `public/`) o manualmente.
- Clona el repo en un runner de GitHub.
- Usa `SamKirkland/FTP-Deploy-Action` (la más usada de la comunidad) para sincronizar `public/` con tu carpeta de GoDaddy vía **FTPS** (FTP seguro).
- **Sync incremental:** mantiene un archivo `.ftp-deploy-sync-state.json` en el servidor que recuerda qué archivos ya estaban. Así solo sube lo que cambió → deploys rápidos después del primero.
- Excluye automáticamente `.git`, `node_modules`, `.DS_Store` y demás ruido.

---

## Troubleshooting

**Error: "FTP login failed" / 530 Login authentication failed**
- Verifica que `FTP_USERNAME` y `FTP_PASSWORD` estén bien. En GoDaddy el usuario muchas veces es `nombre@dominio.com`, no solo `nombre`.
- Confirma que el FTP esté habilitado en tu plan (algunos planes solo usan SFTP).

**Error: "Connection timed out" / "Cannot connect to server"**
- El servidor en `FTP_SERVER` está mal. Verifica en cPanel → Cuentas FTP → "Configurar cliente FTP" la URL exacta.
- Probablemente GoDaddy use SFTP en lugar de FTPS. Si es ese tu caso, avísame y cambiamos a un action que use SFTP en su lugar.

**Error: "Could not find target directory"**
- `FTP_SERVER_DIR` apunta a una carpeta que no existe. Conectáte con FileZilla manualmente y confirmá la ruta exacta.

**El deploy sale verde pero el sitio no cambia**
- Caché del navegador. Probar con `Ctrl+F5` o ventana de incógnito.
- O bien `FTP_SERVER_DIR` apunta a una carpeta que no es la que sirve `unisportec.com`. Verifica desde FileZilla.

---

## Después del primer deploy

Una vez configurado y verificado, **olvidate**. Cada vez que yo (o vos) pusheé algo a `main`, el sitio se actualiza solo en 1-2 minutos. No más subir archivos a mano.
