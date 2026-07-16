# 📋 Guía de Logs para Debugging en Producción

## 🎯 Ubicaciones de los Logs

Los logs se guardan automáticamente en la carpeta de datos de usuario de la aplicación:

### Windows
```
%APPDATA%\electnextstart\
```
Ruta completa típica:
```
C:\Users\TuUsuario\AppData\Roaming\electnextstart\
```

### macOS
```
~/Library/Application Support/electnextstart/
```

### Linux
```
~/.config/electnextstart/
```

---

## 📝 Archivos de Log Disponibles

### 1. `main.log`
- **Contiene:** Logs del proceso principal de la aplicación
- **Incluye:**
  - Inicio de la aplicación
  - Información del sistema
  - Errores de arranque
  - Paths de recursos
  - Estado del servidor Next.js

### 2. `next-server.log`
- **Contiene:** Logs del servidor Next.js en standalone mode
- **Incluye:**
  - Errores HTTP (500, 404, etc.)
  - Errores de base de datos
  - Errores de TypeORM
  - Stack traces completos
  - Logs de app.config.json

---

## 🔍 Cómo Acceder a los Logs

### Opción 1: Desde el Menú de la Aplicación
1. Abre la aplicación empaquetada
2. Ve a **Herramientas** → **Ver Logs**
3. Selecciona:
   - **Abrir Carpeta de Logs** - Abre el explorador de archivos
   - **Ver Log Principal** - Abre `main.log` con el editor por defecto
   - **Ver Log de Next.js** - Abre `next-server.log`
   - **Copiar Ruta de Logs** - Copia la ruta al portapapeles

### Opción 2: Usando el Script de Node.js
```bash
# Ver ubicación de logs
node scripts/read-logs.js

# Leer main.log
node scripts/read-logs.js main

# Leer next-server.log
node scripts/read-logs.js next

# Leer ambos logs
node scripts/read-logs.js both
```

### Opción 3: Manualmente
#### Windows
1. Presiona `Win + R`
2. Escribe: `%APPDATA%\electnextstart`
3. Presiona Enter
4. Abre los archivos `.log` con Notepad o tu editor favorito

#### macOS
```bash
# Abrir carpeta en Finder
open ~/Library/Application\ Support/electnextstart/

# Ver logs en terminal
tail -f ~/Library/Application\ Support/electnextstart/main.log
tail -f ~/Library/Application\ Support/electnextstart/next-server.log
```

#### Linux
```bash
# Abrir carpeta
xdg-open ~/.config/electnextstart/

# Ver logs en terminal
tail -f ~/.config/electnextstart/main.log
tail -f ~/.config/electnextstart/next-server.log
```

---

## 🐛 Debugging del Error 500 Internal Server

### Pasos para diagnosticar:

1. **Ejecuta la aplicación empaquetada**
2. **Reproduce el error** (navega a `/home/users`)
3. **Abre los logs inmediatamente**

### Qué buscar en `next-server.log`:

```
❌ ERROR: [DB] Error leyendo app.config.json
❌ ERROR: ENOENT: no such file or directory
❌ ERROR: ER_CON_COUNT_ERROR
❌ ERROR: 500 Internal Server Error
❌ ERROR: [getUsers] Error:
```

### Información crítica en `main.log`:

```
[main.prod] Server path: C:\...\resources\standalone\server.js
[main.prod] Server exists: true/false
[main.prod] Looking for config at: ...
[main.prod] Config exists: true/false
[main.prod] Files in CWD: [lista de archivos]
```

---

## 📊 Logs Automáticos Mejorados

La aplicación ahora registra automáticamente:

✅ **Información de arranque:**
- Versión de la app
- Plataforma y arquitectura
- Modo empaquetado (isPackaged)
- Rutas de recursos

✅ **Estado del servidor:**
- Puerto asignado
- Existencia de archivos críticos
- Variables de entorno configuradas

✅ **Errores de Next.js:**
- Stack traces completos
- Errores de base de datos
- Errores HTTP con detalles

✅ **Rotación de logs:**
- Los logs se limpian automáticamente si superan 100KB
- Se mantienen los últimos 50KB de cada log

---

## 🚨 Troubleshooting Común

### Error: "app.config.json not found"
```
[main.prod] Config exists: false
```
**Solución:** El archivo no se copió correctamente al empaquetar.

### Error: "Cannot find module 'typeorm'"
```
[Next.js Error]: Error: Cannot find module 'typeorm'
```
**Solución:** Las dependencias no se empaquetaron correctamente.

### Error: "ECONNREFUSED"
```
[getUsers] Error: connect ECONNREFUSED
```
**Solución:** La base de datos no es accesible desde la aplicación empaquetada.

---

## 📧 Compartir Logs para Soporte

Si necesitas ayuda, comparte los logs:

1. Abre la carpeta de logs
2. Comprime los archivos `.log`
3. Adjunta el ZIP al reporte de error

O usa el script:
```bash
node scripts/read-logs.js both > logs-completos.txt
```

---

## 🔄 Limpiar Logs

Para empezar de cero:
```bash
# Windows
del %APPDATA%\electnextstart\*.log

# macOS/Linux
rm ~/Library/Application\ Support/electnextstart/*.log
# o
rm ~/.config/electnextstart/*.log
```

---

## 🎯 Próximo Paso

Después de empaquetar con `npm run pack:win`, ejecuta:

```bash
node scripts/read-logs.js
```

Esto te mostrará la ubicación exacta donde están los logs en tu sistema.
