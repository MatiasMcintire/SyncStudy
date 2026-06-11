# Desplegar SyncStudy para la demo del profe (link público)

Objetivo: que el profe abra un **link HTTPS** y vea el prototipo funcional **con los
datos reales que testearon Kevin y Belén**, sin importar su sistema operativo ni
configurar el router.

Arquitectura de la demo: PocketBase sirve **el frontend y la API en el mismo puerto
(8090)**, y un **túnel Cloudflare** expone ese puerto a internet con una URL HTTPS.

---

## Paso 0 · Pasar el proyecto al Ubuntu Server

La carpeta `pocketbase/` está en `.gitignore` (incluye el binario y la base de datos
con los datos de Kevin/Belén), así que **no viaja por git**. Copiá TODA la carpeta del
proyecto con `rsync` desde tu notebook:

```bash
# En tu notebook. Reemplazá USUARIO e IP-DEL-SERVER.
rsync -avz --progress \
  /home/mts/Escritorio/SyncStudy/ \
  USUARIO@IP-DEL-SERVER:~/SyncStudy/
```

> El binario `pocketbase` es Linux x86-64. El Ubuntu Server es x86-64, así que corre tal cual.

---

## Paso 1 · (en el server) Levantar SyncStudy

```bash
cd ~/SyncStudy
./deploy-demo.sh
```

Esto copia el frontend a `pocketbase/pb_public/` y arranca PocketBase en
`0.0.0.0:8090`. Dejá esa terminal abierta.

Prueba rápida en el server (otra terminal): `curl -I http://localhost:8090` debería
responder `200`.

---

## Paso 2 · (en el server) Levantar el túnel Cloudflare

En **otra terminal**. No necesita cuenta ni tarjeta: el "quick tunnel" da una URL
`https://algo-aleatorio.trycloudflare.com`.

Instalar cloudflared (una sola vez):

```bash
# Ubuntu / Debian x86-64
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

Levantar el túnel apuntando al PocketBase:

```bash
cloudflared tunnel --url http://localhost:8090
```

En la salida aparece una línea tipo:

```
+----------------------------------------------------------+
|  https://abcd-efgh-1234.trycloudflare.com                |
+----------------------------------------------------------+
```

**Ese es el link que le mandás al profe.** Abrilo vos primero para confirmar que
carga la pantalla de login de SyncStudy.

> El link del quick tunnel **vive mientras esa terminal siga abierta**. Si la cerrás,
> cambia. Para la demo de mañana: dejá el server con las dos terminales corriendo
> (o usá `tmux`/`screen` para que sobrevivan a la desconexión SSH).

---

## Paso 3 · Que el profe pueda entrar y ver lo que testearon

Las cuentas y datos que crearon Kevin y Belén ya están en `pb_data`. Mandale al profe,
junto al link:

- **Cuentas de prueba** (si querés que entre como tester):
  - `tester1@syncstudy.local` (Kevin) — clave: *(la que pusiste en el testeo)*
  - `tester2@syncstudy.local` (Belén) — clave: *(la que pusiste en el testeo)*
- O que se **registre** con su propio mail y se una al grupo de prueba con el código
  de invitación que ya existe.

> Si no recordás las claves de los testers, podés entrar al **admin de PocketBase**
> en `http://localhost:8090/_/` (en el server) y resetearlas, o crear una cuenta nueva
> para el profe.

---

## Cómo el profe la "instala" como app (PWA)

SyncStudy es una **PWA**: abierta por el link HTTPS del túnel, el celular ofrece
instalarla como app (ícono propio, pantalla completa, sin barra del navegador). Pasale
estas instrucciones junto al link:

- **Android (Chrome):** abrir el link → menú ⋮ → **"Instalar aplicación"** (o
  "Agregar a pantalla de inicio"). Queda el ícono de SyncStudy en el escritorio.
- **iPhone (Safari):** abrir el link → botón **Compartir** (cuadrado con flecha) →
  **"Agregar a pantalla de inicio"**.

> La instalación como app **requiere HTTPS** — por eso usamos el túnel Cloudflare (da
> HTTPS). Por IP de LAN (`http://192.168...`) NO aparece la opción de instalar.

---

## Dejarlo estable para mañana (recomendado: tmux)

Para que el SSH se pueda cerrar sin tumbar la demo:

```bash
sudo apt install -y tmux
tmux new -s syncstudy

# dentro de tmux:
#   ventana 1:  ./deploy-demo.sh
#   Ctrl+b c   (nueva ventana)
#   ventana 2:  cloudflared tunnel --url http://localhost:8090
#   Ctrl+b d   (te desconectás; sigue corriendo)

# para volver a mirar:
tmux attach -t syncstudy
```

---

## Checklist final antes de mandar el link

- [ ] `./deploy-demo.sh` corriendo (responde `curl -I http://localhost:8090` → 200).
- [ ] `cloudflared` corriendo y mostró la URL `https://...trycloudflare.com`.
- [ ] Abriste esa URL desde tu celular (con datos móviles, no WiFi) y carga el login.
- [ ] Entraste con una cuenta y ves los grupos/tareas de la prueba.
- [ ] Le pasaste al profe: el link + cómo entrar (cuenta o registro + código de grupo).
