# Minify and Obfuscate JavaScript

This project keeps the original JavaScript in `assets/js/` and generates a separate processed copy in `js-dist/assets/js/`.

The generated files are minified with Terser and then obfuscated with JavaScript Obfuscator. The original files are never modified.

## First-time setup

Open a terminal in the project root:

```powershell
npm install
```

This installs the tools listed in `package.json` and creates `package-lock.json`.

## After changing JavaScript

Edit only the source files inside:

```text
assets/js/
```

Then generate a clean processed version:

```powershell
npm run build:js:clean
```

The output is created here:

```text
js-dist/assets/js/
```

The folder keeps the same structure as the source folder. Every `.js` file inside `assets/js/`, including files in subfolders, is processed automatically.

## Copy to the project for GitHub

Copy the generated folder contents over the `assets/js/` folder of the separate project that will be published:

```text
js-dist/assets/js/  ->  github-copy/assets/js/
```

On Windows PowerShell, replace the destination path as needed:

```powershell
Copy-Item .\js-dist\assets\js\* D:\path\to\github-copy\assets\js\ -Recurse -Force
```

Do not copy the source files over the processed files afterward.

## Important rules

- Edit source files in `assets/js/`, never files in `js-dist/`.
- Run `npm run build:js:clean` after every JavaScript change.
- Keep the folder structure unchanged when copying the result.
- The published project must contain the generated files at `assets/js/`.
- Do not publish `node_modules/`, `package.json`, or `scripts/` unless you also want to keep the build tools in that project.
- The generated JavaScript is not secret. Minification and obfuscation only make it harder to read; browser users can still download it.

## Useful commands

Regenerate without deleting the existing output first:

```powershell
npm run build:js
```

Regenerate from a clean output folder:

```powershell
npm run build:js:clean
```

To check how many generated files exist:

```powershell
(Get-ChildItem .\js-dist\assets\js -Recurse -Filter *.js).Count
```
