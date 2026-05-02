# Lenormand Oracle

Plain HTML, CSS, and JavaScript Lenormand card reading app prepared for Vercel deployment.

## Project structure

```text
index.html
styles.css
app.js
README.md
vercel.json
data/cards.json
assets/cards/
```

## Vercel deployment

Use these settings in Vercel:

- Framework Preset: Other
- Root Directory: repository root
- Build Command: leave blank
- Output Directory: leave blank or `.`
- Install Command: leave blank

No backend or API keys are required for this static version.

## Current features

- One-card draw
- Three-card reading
- Card library
- Keyword search
- Local browser journal using `localStorage`
- Relative asset paths for Vercel/static hosting

## Asset paths

The app expects card images at:

```text
./assets/cards/1.png
./assets/cards/2.png
...
./assets/cards/36.png
./assets/cards/back.png
```

The card data lives at:

```text
./data/cards.json
```

## Next smallest fix

Upload the 36 card images and card back into `assets/cards/` if they are not already present.
