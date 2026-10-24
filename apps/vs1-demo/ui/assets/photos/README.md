# Marketing-Fotos

Echte Fotos für die Marketingseite, alle im CompliHub-Look **B · Petrol & Papier**.

| Was | Wo |
|---|---|
| Originale, unverändert | `originals/` |
| Bildlook als 3D-LUT (Quelle des Looks) | `complihub-look-b.cube` |
| Herkunft, Lizenz, Zuschnitt je Foto | `manifest.json` |
| Fertige Web-Bilder (AVIF und WebP, 640/1280/1920 px) | `public/img/photos/` |
| LUT erzeugen | `scripts/photos/make-look-lut.py` |
| Fotos graden und exportieren | `scripts/photos/grade-photos.py` |

## Regeln

- **Keine KI-Bilder.** Nur echte Fotos, keine 3D-Renders. Quellen: Pexels und Unsplash (beide verbieten KI-Uploads), Pixabay nur nach Prüfung des Labels „AI-generated“ auf der Bildseite.
- **Stock-Menschen sind nie unsere Kunden, Provider oder Fachleute.** Keine Namen, Zitate oder Bildunterschriften, die das nahelegen. Die Lizenzen verbieten es teils, und vor allem die DNA: Trust is our product.
- **Keine fremden Marken und keine politischen Botschaften im Bild.** Was stört, kommt per `crop` im Manifest raus. Das Original bleibt unverändert.
- **Der Look lebt nur in der LUT.** Kein Nachfärben per CSS-Filter oder in Figma. Figma bekommt die exportierten Bilder.

## Neues Foto aufnehmen

1. Original nach `originals/<slug>.jpg` legen, möglichst in voller Auflösung.
2. Eintrag in `manifest.json`: Quelle, ID, Fotograf, URL, Lizenz, bei Bedarf `crop` als `[links, oben, rechts, unten]` in Pixeln des Originals.
3. `python3 scripts/photos/grade-photos.py <slug>` (braucht Pillow ≥ 11.3 und numpy).
4. Credits unten ergänzen.

## Look ändern

Formel in `scripts/photos/make-look-lut.py` anpassen, `python3 scripts/photos/make-look-lut.py` ausführen, danach `python3 scripts/photos/grade-photos.py` für alle Fotos. Die `.cube`-Datei lässt sich auch in Lightroom, Photoshop oder Premiere laden. So sehen Fotos und künftige Videos gleich aus.

## Credits

Namensnennung ist bei allen drei Lizenzen nicht Pflicht. Wir führen sie trotzdem.

| Foto | Fotograf | Quelle |
|---|---|---|
| `owner-laptop-boxes` | Kampus Production | [Pexels 7857526](https://www.pexels.com/photo/person-looking-at-charts-displayed-on-a-laptop-and-sitting-at-the-table-with-cardboard-boxes-7857526/) |
| `owner-packing-table` | M. Cooper | [Unsplash V5XaBkW6PO8](https://unsplash.com/photos/V5XaBkW6PO8) |
| `side-by-side` | CoWomen | [Unsplash YqBORf3ggKA](https://unsplash.com/photos/YqBORf3ggKA) |
| `expert-review` | Van Tay Media | [Unsplash TFFn3BYLc5s](https://unsplash.com/photos/TFFn3BYLc5s) |
| `calm-review` | *offen* | [Unsplash Vvn0OD0IxBM](https://unsplash.com/photos/Vvn0OD0IxBM) |
| `warehouse-shelves` | ALHawraa | [Pexels 38195854](https://www.pexels.com/photo/warehouse-storage-with-stacked-cardboard-boxes-38195854/) |
| `port-aerial` | Tom Fisk | [Pexels 3856440](https://www.pexels.com/photo/drone-shot-of-a-docked-cargo-ship-at-a-port-3856440/) |
| `parcel-car` | *offen* | [Pixabay 1511683](https://pixabay.com/photos/package-packaging-delivery-1511683/) |
