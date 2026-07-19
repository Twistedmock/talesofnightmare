# tools

`responsive.mjs` regenerates the `-800w` / `-1200w` WebP and AVIF variants that
`index.php` serves through `<picture>`. Run it after adding artwork:

    npm install sharp        # once
    node tools/responsive.mjs
    php build.php

It never upscales, so a small master simply gets fewer variants.
