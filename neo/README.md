# neo/: NEO's own tools

*中文版：[README.zh-CN.md](README.zh-CN.md)*

`core/` is an unmodified mirror of Lemo-Opuscar's tools and is never edited here (see [UPSTREAM.md](../UPSTREAM.md)). Tools that NEO-Cine adds go in this folder, so a sync with upstream can never overwrite them.

- `publish.sh`: uploads the demo films and their 720p web cuts to the repository's releases, for the gallery ([MAINTAINING.md](../MAINTAINING.md), "Publish").
- `geo/osm.py`: turns OpenStreetMap into one JSON file a film page can draw (coast closed into land, water, woods, peaks, roads, railways, buildings, place names; metres around an origin, lines simplified). The styles in the Real Maps series use it; usage is at the top of the file and in [`styles/atlas-scroll/STYLE.md`](../styles/atlas-scroll/STYLE.md) §9 and §10. Data © OpenStreetMap contributors, ODbL 1.0.
- `geo/ohm.py`: the same for OpenHistoricalMap, with dates: borders, railways and named routes, each with the first and last year it existed, so a page can draw the map of any year. Give it the same `--origin` and `--proj` as the `osm.py` file it is drawn over. Used by [`styles/atlas-scroll`](../styles/atlas-scroll/STYLE.md). Data CC0.
