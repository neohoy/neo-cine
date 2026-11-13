# Half Past One (凌晨一点半): facts on screen

Every fact the film shows, with its source. Checked 2026-11-13. Official sources first; the timetable is the operator's own published GTFS feed, read with `neo/geo/gtfs.py` and `tools/prep.py` (the numbers they print are quoted below).

## The timetable

| | |
|---|---|
| Feed | Wiener Linien GTFS, `gtfs.zip` from https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip (the files in the zip are dated 2026-11-09; downloaded 2026-11-13) |
| Publisher and licence | Wiener Linien GmbH & Co KG (`agency.txt`), published on the Austrian open-data portal as "Wiener Linien – Fahrplandaten GTFS Wien" under Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de). The licence is read from the portal's record as harvested by data.europa.eu (dataset `ab4a73b6-1c2d-42e1-b4d9-049e04889cf0`), checked 2026-11-13. |
| Service days used | Thursday 19, Friday 20 and Saturday 21 November 2026 (`--date 20261119`, `20261120`, `20261121`, agency `04`, route type 1: U1, U2, U3, U4, U6) |
| What it is | Scheduled times, one time per stop (departure); not live positions. The film says "scheduled times" and "train positions estimated" on the last card. |

## Claims

| On screen | Value | Source and how it was found |
|---|---|---|
| 周四夜里，末班车一列列开回终点 / Thursday night: the last trains run home | Last scheduled arrivals of the Thursday service day: U4 00:47 (Hütteldorf), U3 00:48 (Ottakring), U1 00:50 (Leopoldau), U6 00:55 (Siebenhirten), U2 01:00 (Seestadt) | GTFS, service day 2026-11-19; `prep.py` prints `周四夜里各线末班到站： {'U1': '00:50', 'U2': '01:00', 'U3': '00:48', 'U4': '00:47', 'U6': '00:55'}`. The Friday service day's first U-Bahn trip leaves at 04:39 (U6), so nothing runs in between. Cross-check, the city's tourist board (wien.info, official): "Die Wiener U-Bahn fährt täglich von ca. 5.00 Uhr bis ca. Mitternacht." https://www.wien.info/de/reiseinfos/verkehr/u-bahn-362202 |
| 周四 01:30 · 五条线都停了 / Thursday 1:30 a.m.: all lines stopped | 0 trains running | GTFS, as above; `prep.py`: `周四 01:30：线上 0 列车` |
| 周五 01:30 · 线上 21 列车 / Friday 1:30 a.m.: 21 trains running | 21 | GTFS, Saturday service day 2026-11-21 (the night trains of Friday night belong to it) plus the Friday day's last trips; a train counts from its first departure to its last scheduled time. `prep.py`: `周五 01:30：线上 21 列车`. The clock's live count uses the same rule. |
| 周五、周六夜里，整夜每 15 分钟一班 / Weekend nights: every 15 minutes, all night | every line, both directions, 15 min | wien.info (official tourist board of the City of Vienna), same page: "An Freitagen, Samstagen und vor Feiertagen verkehren die Züge auch die ganze Nacht hindurch im 15-Minuten-Takt." Cross-checked in the GTFS: on the Saturday service day, 01:00–04:00, each of the 10 line-directions has 12 departures at 15-minute intervals (40 departures per hour on the network). |
| 二十四小时后，同一张图 / Twenty-four hours later, the same map | Thursday 01:30 → Friday 01:30 | the two clock times shown |
| Clock and "线上列车 / trains running" | scheduled, per minute | GTFS; positions between stops are estimated (below) |
| Line colours | U1 #E3000F, U2 #A862A4, U3 #EF7C00, U4 #319F49, U6 #9D6830 | GTFS `routes.txt`, `route_color` (public facts; no operator logo or line bullet is drawn) |
| Station names | as in OpenStreetMap (`name`), e.g. Südtiroler Platz-Hauptbahnhof, Bahnhof Meidling | OSM; the GTFS writes some of them shorter (Südtiroler Pl. - Hbf.); `prep.py` maps the GTFS names onto the OSM ones (`ALIAS`) |
| U2 Seestadt–Karlsplatz | 21 stations | GTFS patterns of 19–21 Nov 2026 (the route's long name in `routes.txt` still says Schottentor; the stop sequences run to Karlsplatz), matching OSM |

## Estimates the film makes (not claimed as facts)

- **Train positions between stations**: the feed gives one time per stop. The film lets each train stand 20 s at a stop (it arrives 20 s before the published time, or 30 % of the leg when that is shorter) and move between stops on a smooth acceleration curve along the drawn line. The last card says "train positions estimated / 列车位置按时刻表推算".
- **U6 northbound skips Neue Donau** in some Thursday patterns of this feed; the film passes through that station without stopping, as the feed does.
- **The ground colour** follows the sun in Vienna in late November (civil dawn about 06:40, sunrise about 07:15, sunset about 16:15, civil dusk about 16:50); this is not written on screen.
- **The map is a diagram**: stations sit on average 270 m (at most about 1 km, Heiligenstadt) from their true place, so that every line can run at 0°, 45° or 90° (`prep.py`). Water and green areas are drawn in their true outline.
