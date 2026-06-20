# Notas sobre Auditoría de Seguridad (npm audit)

Al ejecutar `npm audit`, actualmente se reportan algunas vulnerabilidades (moderadas y altas) asociadas a dependencias profundas (transversales) de nuestros paquetes.

Por el momento, **hemos decidido mantener las versiones actuales y no forzar una actualización (`npm audit fix --force`)** debido a las siguientes razones técnicas:

## 1. Vulnerabilidades en `esbuild` / `vite` / `astro`

- **Reporte:** `esbuild` permite lectura de archivos arbitraria en el servidor de desarrollo y falta de verificación de integridad en Deno.
- **Por qué no actualizamos:** Arreglar esta vulnerabilidad automáticamente (`--force`) implicaría degradar `astro` a una versión antigua (e.g. `2.4.5`) que rompería la compatibilidad de nuestro código, o bien forzar versiones incompatibles de Vite.
- **Riesgo real:** Esta vulnerabilidad afecta exclusivamente al **entorno de desarrollo local** (al correr `npm run dev` en Windows) o a entornos que usen Deno. Dado que nosotros compilamos a código estático para producción (`npm run build`), este riesgo no es explotable por los usuarios finales en nuestro entorno de producción.

## 2. Vulnerabilidades en `uuid` / `firebase-admin`

- **Reporte:** Falla de seguridad en `uuid` (buffer bounds check) utilizado internamente por `firebase-admin` (a través de `gaxios` y `@google-cloud/storage`).
- **Por qué no actualizamos:** Arreglarlo instalaría `firebase-admin@10.3.0`, introduciendo "breaking changes" en nuestra API backend de Node.js, ya que versiones superiores de `firebase-admin` podrían requerir cambios de sintaxis o dejar de soportar ciertas configuraciones antiguas de inicialización.
- **Riesgo real:** El riesgo es moderado. `firebase-admin` solo corre en nuestro backend privado y confiable, no se expone directamente al cliente de manera que alguien pueda manipular los "buffers" de UUID.

## Conclusión

Para asegurar la estabilidad del torneo y del monorepo, priorizamos mantener las versiones fijas que sabemos que interactúan bien entre sí. En una etapa futura del proyecto, planearemos un "Version Bump" programado donde evaluaremos actualizar y refactorizar todo para adaptarnos a las últimas versiones principales de Astro y Firebase Admin.
