# Sai Brundavan Grand — cleaned logo assets

Rebuilt from `../brundavanLogo.png`, which was a flat PNG on a solid white
background with JPEG-style speckle around the letterforms.

What was done:

- **White background keyed out to real transparency**, un-premultiplying each
  edge pixel so anti-aliased strokes keep their true colour. The logo now sits
  cleanly on any background, with no white box and no halo.
- **Denoised.** Near-white speckle was dropped, and off-brand pixels snapped to
  the two brand colours, removing the mottling around the letters.
- **Trimmed** to the artwork (882×272 → 805×212), so padding is controlled by
  layout rather than baked in.
- **Aspect ratio preserved everywhere.** Never stretch these.

| File | Use |
| --- | --- |
| `brundavan-logo.png` | 805×212, transparent. The default, for light backgrounds. |
| `brundavan-logo@2x.png` | 1610×424, sharpened. Retina and print. |
| `brundavan-logo-on-dark.png` | Dark-background variant — the black "Sai", Telugu line and VEG/NON-VEG text become cream; brand red and green are unchanged. |
| `brundavan-emblem.png` | The H-and-wreath crest alone, 119×108. Favicons, app icons, small marks. |
| `brundavan-emblem@3x.png` | The same crest at 357×324. |
| `app-icon-512.png` | Rounded app tile used for the installed web app. |

**Brand colours**, sampled from the artwork:

| Colour | Hex | Where |
| --- | --- | --- |
| Brundavan red | `#E11B33` | Wordmark, the H, the non-veg mark |
| Veg green | `#15A05A` | Wreath, leaf, the veg mark |
| Deep red | `#8F1D2C` | UI primary — the wordmark red darkened for legible text and buttons |
