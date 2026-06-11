# Instalar SyncStudy en local (Windows) 🪟

Guía para correr SyncStudy en tu propia PC con Windows, sin depender del servidor ni
de internet. Todo corre en tu máquina.

> **Cómo funciona (en 1 frase):** PocketBase es el backend (base de datos + API) y, al
> mismo tiempo, sirve la página web. Levantás un solo programa y abrís el navegador. Listo.

---

## Lo que necesitás antes de empezar

1. **Windows 10 u 11** y un navegador (Chrome, Edge o Firefox).
2. **La carpeta `pocketbase/`** que te paso yo (por Drive / WhatsApp / pendrive).
   - Trae la base de datos con los datos, el schema y la lógica del servidor.
   - **Ojo:** adentro viene un archivo llamado `pocketbase` (sin extensión) que es de
     **Linux** y **NO sirve en Windows**. Lo vas a reemplazar en el Paso 2.

No necesitás instalar nada más (ni Node, ni Python, ni Git). Es un solo `.exe`.

---

## Paso 1 · Poner la carpeta en un lugar cómodo

Descomprimí/copiá la carpeta `pocketbase` en una ruta simple y sin tildes ni espacios
raros. Por ejemplo:

```
C:\SyncStudy\pocketbase\
```

Adentro deberías ver, entre otras cosas: `pb_data`, `pb_migrations`, `pb_hooks`,
`pb_public` y el archivo `pocketbase` (el de Linux, que vamos a cambiar).

---

## Paso 2 · Descargar PocketBase para Windows

1. Entrá a la página oficial de descargas:
   **https://pocketbase.io/docs/** → botón **Download** (o https://github.com/pocketbase/pocketbase/releases).
2. Bajá el archivo para **Windows** de la versión **0.38.x**. El nombre se ve así:

   ```
   pocketbase_0.38.x_windows_amd64.zip
   ```

   > Usá la **misma versión mayor (0.38)** que uso yo, así la base de datos abre sin
   > problemas. Si en la página hay una más nueva (0.39, 0.40…), avisame antes de usarla.

3. Descomprimí ese `.zip`. Adentro hay un único archivo importante: **`pocketbase.exe`**.

4. **Copiá `pocketbase.exe` dentro de la carpeta del Paso 1** (al lado de `pb_data`):

   ```
   C:\SyncStudy\pocketbase\pocketbase.exe
   ```

   El archivo viejo `pocketbase` (sin `.exe`, el de Linux) podés dejarlo o borrarlo,
   no se usa en Windows.

---

## Paso 3 · Levantar el servidor

1. Abrí la carpeta `C:\SyncStudy\pocketbase\` en el Explorador de archivos.
2. En la barra de direcciones de esa carpeta, escribí `powershell` y apretá **Enter**.
   (Eso abre una terminal **ya parada en esa carpeta**.)
3. Escribí este comando y apretá **Enter**:

   ```powershell
   .\pocketbase.exe serve
   ```

4. Si Windows muestra una advertencia azul de **"Windows protegió tu PC"** (SmartScreen):
   hacé clic en **Más información → Ejecutar de todas formas**. Es porque el `.exe` no
   está firmado, no es un virus.

Cuando arranca bien, vas a ver algo como esto:

```
Server started at http://127.0.0.1:8090
├─ REST API:  http://127.0.0.1:8090/api/
└─ Dashboard: http://127.0.0.1:8090/_/
```

**Dejá esa ventana abierta.** Mientras esté abierta, SyncStudy funciona. Si la cerrás,
se apaga el servidor.

---

## Paso 4 · Abrir SyncStudy

En tu navegador andá a:

```
http://127.0.0.1:8090
```

Tiene que aparecer la pantalla de **login de SyncStudy**. 🎉

- **Entrar:** registrate con tu correo, o usá una cuenta que ya exista en la base.
- **Unirte a un grupo:** con el **código de invitación de 6 caracteres** que te paso yo.

---

## (Opcional) Panel de administración

Para ver/editar la base de datos a mano (usuarios, grupos, tareas):

```
http://127.0.0.1:8090/_/
```

La primera vez quizás te pida crear un **usuario administrador** (un mail y clave
cualquiera, solo para vos). Eso es del panel de admin, no es lo mismo que tu cuenta de
SyncStudy.

---

## Para apagar y volver a prender

- **Apagar:** en la ventana de PowerShell apretá **Ctrl + C** (o cerrá la ventana).
- **Volver a prender:** repetí el **Paso 3** (abrir la carpeta → `powershell` → `.\pocketbase.exe serve`).

---

## Si algo no anda 🔧

| Síntoma | Qué hacer |
|---|---|
| Sale **"No se pudo conectar al servidor PocketBase"** en la web | La ventana de PowerShell se cerró o no está corriendo. Volvé al Paso 3. |
| `'.\pocketbase.exe' no se reconoce…` | No estás parado en la carpeta correcta, o el `.exe` no está ahí. Confirmá que `pocketbase.exe` esté en la misma carpeta donde abriste PowerShell. |
| **"This app can't run on your PC"** | Bajaste la versión equivocada. Tiene que ser `windows_amd64`. |
| `address already in use` / puerto 8090 ocupado | Ya tenés otro PocketBase abierto, o el puerto está tomado. Cerrá la otra ventana, o levantá en otro puerto: `.\pocketbase.exe serve --http=127.0.0.1:8091` y abrí `http://127.0.0.1:8091`. |
| Windows Defender / firewall pregunta | Dale **Permitir acceso**. Como es solo en tu PC (`127.0.0.1`), no expone nada a internet. |
| La web carga rara / desactualizada | Recargá con **Ctrl + F5** (limpia el caché de la PWA). |

---

## Resumen ultra corto

1. Te paso la carpeta `pocketbase/`.
2. Bajás `pocketbase.exe` (Windows, v0.38.x) y lo metés en esa carpeta.
3. Abrís PowerShell en la carpeta → `.\pocketbase.exe serve`.
4. Navegador → `http://127.0.0.1:8090`.

Cualquier cosa me escribís. — Matías
