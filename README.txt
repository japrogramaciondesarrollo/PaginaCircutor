LOGIN (local, sin GEDE por ahora)
- Usuario/contraseña configurables en: backend\.env
    APP_ADMIN_USER=admin
    APP_ADMIN_PASSWORD=admin123

Nota:
- En esta etapa el login NO llama a GEDE. Más adelante se usará GEDE sólo cuando
  quieras interrogar un concentrador específico.


\
GEDE Web - Paso 1 (Login con temas claro/oscuro)
==============================================

Requisitos
- Windows 10/11
- Python 3.11+ instalado y agregado al PATH

Instalación y ejecución
1) Copiar la carpeta "gede-web" a C:\  (queda: C:\gede-web\...)
2) Abrir "Símbolo del sistema" (cmd) y ejecutar:

   cd C:\gede-web
   run_backend.bat

3) Abrir el navegador en:
   http://localhost:8000/
   (redirige a /login.html)

Edición de marca (textos)
- Se editan preferentemente en: backend\.env
    APP_TITLE=CES
    APP_SUBTITLE=Telegestión

- Fallback (si el backend no responde /api/config):
    frontend\static\app-config.json

Tema claro/oscuro
- Botón de tema en la esquina superior derecha del panel de login.
- Se guarda la preferencia en el navegador (localStorage).

Notas
- La IP por defecto del equipo GEDE está en backend\.env (GEDE_DEVICE_IP).
- También podés poner la IP en el campo "IP del equipo (opcional)" en el login.

Si algo falla, compartime el texto del error que aparece en la consola.

\
Página principal (home)
- Archivo: frontend\static\home.html
- Config de módulos editable: frontend\static\modules-config.json

Imágenes
- Colocá imágenes en: frontend\static\assets\img\
- La imagen de fondo de Página 1 se usa desde:
  /assets/img/pagina1_fondo.jpg

Página Medidores (usa GEDE)
- Archivo: frontend\static\medidores.html
- JS: frontend\static\js\medidores.js
- Backend endpoint: POST /api/meters/report

Excel de concentradores
- Se incluye en: backend\data\concentradores.xlsx
- Se configura ruta con: CONCENTRADORES_XLSX_PATH (backend\.env)

Secuencia (igual a Postman)
1) Login al concentrador: POST http://{IP}/api/v1/login con body XML:
   <Login Username="admin" Password="Adm1n"/>
2) Tomar Token y usarlo en Authorization: Bearer {token}
3) Pedir reporte: GET http://{IP}/api/v1/report/{reportName}
   Params: idMeters (CIR...), fini, fend, priority


Excel: filas
- IP: fila 3
- Concentrador: fila 9

