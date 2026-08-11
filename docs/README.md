# Visor de informes compartidos

Esta carpeta es lo que se publica con **GitHub Pages**. Contiene la página que abren las
personas con las que compartes resultados de backtesting.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `visor.html` | La página del visor. **Generada, no editar a mano.** |
| `index.html` | Aviso para quien llegue a la raíz sin un enlace completo. |
| `.nojekyll` | Evita que GitHub Pages procese la carpeta con Jekyll. |

## Cómo se publica (una sola vez)

1. En GitHub: **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/docs`.
2. Espera un minuto y comprueba que responde:
   `https://javilaox.github.io/trading-journal/visor.html`
3. Esa dirección ya está puesta en `SHARE_VIEWER_URL` dentro de `.env.production` y
   `.env.staging`, así que viaja dentro del build y **el cliente final no configura nada**.

## Cuando cambie el visor

`visor.html` se genera desde `src/services/backtestShareViewer.js`, que es el mismo código que
usa la app. Si lo tocas, hay que regenerarlo y volver a subirlo:

```
npm run build:viewer
git add docs/visor.html && git commit -m "Actualizar visor" && git push
```

Se hace con un script y no a mano precisamente para que la página publicada no se quede atrás
respecto al código.

## Por qué no se aloja en Supabase

Supabase Storage —y las Edge Functions fuera del plan Pro con dominio propio— devuelven los
archivos HTML con `Content-Type: text/plain` a propósito, como medida antiabuso. El navegador
mostraba el código fuente en vez de la página. Cualquier alojamiento estático normal lo sirve
bien, así que el visor vive aquí.

## Qué contiene el archivo publicado

Solo la URL y la clave anónima de Supabase, que es pública por diseño y está limitada por las
políticas RLS. **Ningún dato de ningún backtest.**

Los datos los sirve la función `open_backtest_report`, que valida la contraseña y el límite de
dispositivos en el servidor antes de devolver nada. Ese es el motivo de que el informe no viaje
dentro del HTML: si lo hiciera, ambas protecciones serían decorativas, bastaría con mirar el
código fuente de la página.

El identificador del informe va en el fragmento de la URL (`visor.html#TOKEN`). El fragmento no
se envía al servidor que aloja la página, así que ni siquiera GitHub registra qué informe se ha
abierto.
