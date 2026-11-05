ATEMPORAL — GUÍA RÁPIDA

ARCHIVOS
- login.html: inicio de sesión.
- auth.js: correo/contraseña, Google y teléfono por SMS.
- index.html: panel principal.
- app.js: tareas, objetivos, hábitos, notas y finanzas.
- supabase.js: URL y clave pública del proyecto.
- style.css: diseño.
- schema.sql: tablas y políticas RLS.

1) CONFIGURAR SUPABASE
A. Abre tu proyecto de Supabase.
B. Ve a Project Settings > API.
C. Copia Project URL y la clave publicable (anon/public) en supabase.js.
   NO uses service_role ni claves secretas en el navegador.
D. Abre SQL Editor, crea una consulta, pega schema.sql y ejecútala.

2) ACTIVAR MÉTODOS DE ACCESO
- Correo: Authentication > Providers > Email.
- Google: Authentication > Providers > Google. Configura Client ID/Secret en Supabase.
- Teléfono: Authentication > Providers > Phone. Configura un proveedor SMS.
Los proveedores externos pueden requerir configuración y tener costos.

3) CONFIGURAR URLS
En Authentication > URL Configuration, añade la URL local o de alojamiento a
Site URL y Redirect URLs. Para pruebas locales, usa un servidor local, no abras
los archivos con doble clic.

4) EJECUTAR
La opción sencilla es abrir la carpeta con VS Code y usar la extensión Live Server.
Abre login.html desde Live Server. También puedes desplegar la carpeta en un hosting
estático HTTPS.

5) NOTAS
- Cada fila se asocia al usuario autenticado y RLS limita su acceso.
- Los puntos se calculan en el navegador: 10 por tarea completada y 5 por hábito
  marcado como completado. En esta versión, el check de hábito representa el estado
  de hoy y no guarda un historial diario.
- Los cambios se envían a Supabase al crear, editar el progreso o eliminar.
- No publiques contraseñas, service_role keys ni tokens.
- Este proyecto es una base funcional reconstruida. No es una copia exacta del
  diseño/código anterior, porque el código anterior no estaba completo en el chat.
