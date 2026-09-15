# Minificar y ofuscar JavaScript

Este proyecto conserva el JavaScript original y legible en `assets/js/` y genera
una copia procesada independiente en `js-dist/assets/js/`.

Los archivos generados se minifican con Terser y después se ofuscan con
JavaScript Obfuscator. Los archivos originales nunca se modifican.

## Configuración inicial

Abre PowerShell en la carpeta raíz del proyecto y ejecuta una sola vez:

```powershell
npm install
```

Este comando instala las herramientas definidas en `package.json` y genera
`package-lock.json`.

## Después de modificar JavaScript

Edita únicamente los archivos originales dentro de:

```text
assets/js/
```

Cuando termines los cambios, genera una salida limpia ejecutando:

```powershell
npm run build:js:clean
```

Este comando procesa automáticamente todos los archivos `.js` dentro de
`assets/js/`, incluyendo los que están en subcarpetas.

La salida se genera en:

```text
js-dist/assets/js/
```

La estructura de carpetas se conserva. Por ejemplo:

```text
assets/js/calculator/stats-engine.js
js-dist/assets/js/calculator/stats-engine.js
```

## Copiar los archivos al proyecto de GitHub

Después de ejecutar el build, copia el contenido generado sobre la carpeta
`assets/js/` de la copia que subirás a GitHub.

```text
js-dist/assets/js/  ->  copia-github/assets/js/
```

En PowerShell, reemplaza la ruta de destino por la ubicación real de tu copia:

```powershell
Copy-Item .\js-dist\assets\js\* D:\ruta\a\copia-github\assets\js\ -Recurse -Force
```

Después entra en la carpeta de la copia de GitHub y sube los cambios:

```powershell
git add .
git commit -m "Update minified JavaScript"
git push origin main
```

## Flujo completo

Cada vez que cambies un archivo JavaScript, ejecuta desde el proyecto original:

```powershell
npm run build:js:clean
Copy-Item .\js-dist\assets\js\* D:\ruta\a\copia-github\assets\js\ -Recurse -Force
```

Luego, desde la copia de GitHub:

```powershell
git add .
git commit -m "Update minified JavaScript"
git push origin main
```

## Reglas importantes

- Edita los archivos originales en `assets/js/`, nunca los archivos de `js-dist/`.
- Ejecuta `npm run build:js:clean` después de cada cambio en JavaScript.
- No copies nuevamente los archivos originales sobre los archivos procesados.
- Mantén la misma estructura de carpetas al copiar la salida.
- El proyecto publicado debe tener los archivos procesados dentro de `assets/js/`.
- No es necesario copiar `node_modules/`, `package.json` ni `scripts/` al proyecto publicado.
- La ofuscación no hace que el código sea secreto: los usuarios todavía pueden
	descargar y analizar el JavaScript que recibe el navegador.

## Comandos útiles

Para regenerar sin limpiar primero la carpeta de salida:

```powershell
npm run build:js
```

Para regenerar eliminando antes la salida anterior:

```powershell
npm run build:js:clean
```

Para comprobar cuántos archivos generados existen:

```powershell
(Get-ChildItem .\js-dist\assets\js -Recurse -Filter *.js).Count
```
