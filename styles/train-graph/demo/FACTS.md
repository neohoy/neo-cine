# Two Lines, One Day: facts

Every fact on screen, with its source. Checked 2026-11-13. Timetable facts are for the service day Wednesday 18 November
2026 in the gtfs.de fv_free feed (DELFI e.V., CC BY 4.0), downloaded 2026-11-13; they were read from `stop_times.txt`
by `tools/prep.py` and printed again from `data/graph.json`.

## On screen

| Claim (on screen) | Value | Source | Quoted wording / how it was measured |
|---|---|---|---|
| 高速新线 2002 年通车 / Opened 2002 | 2002 | Deutsche Bahn, "Infrastruktur" (30 Jahre ICE media kit), https://www.deutschebahn.com/de/presse/suche_Medienpakete/30-Jahre-ICE/Infrastruktur | "Eine Ausnahme bildet die 2002 eröffnete Schnellfahrstrecke Köln–Rhein/Main." Cross-check: Deutsche Bahn press release of 2 Aug 2017, as reprinted by LOK Report (https://www.lok-report.de/news/deutschland/verkehr/332-deutsche-bahn-15-jahre-schnellfahrstrecke-koeln-rhein-main.html): "Heute vor 15 Jahren hat die Deutsche Bahn (DB) den Betrieb auf Deutschlands erster 300 km/h-Hochgeschwindigkeitsstrecke …" (2017 − 15 = 2002); de.wikipedia "Schnellfahrstrecke Köln–Rhein/Main": "Die Strecke wurde in den Jahren 1995 bis 2002 errichtet". |
| 按 300 km/h 设计 / built for 300 km/h | 300 km/h | the same DB page | "Deutschlands erste für 300 km/h ausgelegte Strecke ist ausschließlich für Hochgeschwindigkeitszüge zugelassen". Cross-check: de.wikipedia infobox "Streckengeschwindigkeit: 300 km/h". |
| 高速新线 · 180 km (line name, left margin) | 179.7 km Köln Hbf – Frankfurt (Main) Hbf | measured on OpenStreetMap (tools/prep.py: shortest path on railway=rail through the stations, great-circle length) | Cross-check: de.wikipedia "eine 180 Kilometer lange deutsche Eisenbahn-Hochgeschwindigkeitsstrecke"; DB 2017 press release: "Die direkte Schienenverbindung zwischen Köln und Frankfurt/Main ist 177 Kilometer lang." The OSM route of the ICE 49 relation measures 179.5 km. |
| 莱茵河谷线 · 221 km | 221.0 km Köln Hbf – Bonn – Koblenz – Mainz – Frankfurt Flughafen – Frankfurt (Main) Hbf | measured on OpenStreetMap, as above | Köln Hbf – Mainz Hbf measures 184.1 km. Cross-check: de.wikipedia "Linke Rheinstrecke": operation section "185 Kilometern", infobox "181 km". |
| 一分钟之差，都开往曼海姆 / One minute apart, both bound for Mannheim | IC 55 dep. Köln Hbf 08:53, via Bonn 09:14, Koblenz 09:46/09:48, Mainz 10:39/10:42, arr. Mannheim Hbf 11:21; ICE 43 dep. Köln Hbf 08:54, arr. Frankfurt(M) Flughafen Fernbf 09:49, arr. Mannheim Hbf 10:26 | GTFS feed, 18 Nov 2026 | stop_times.txt of the two trips (the stub labels on screen read "Mannheim 11:21" and "Mannheim 10:26") |
| ICE 43：55 分钟到法兰克福机场 / Frankfurt Airport in 55 min | 08:54 → 09:49 | GTFS feed | difference of the published times |
| IC 55 这时刚离开科布伦茨 / IC 55 is just leaving Koblenz | at 09:49 IC 55 has left Koblenz Hbf (dep. 09:48) | GTFS feed | published times |
| 每小时同一分钟发车 / Every hour, the same minutes | a train leaves Köln Hbf on the high-speed line at :18 or :19 every hour from 08:19 to 22:18 (ICE 79 08:19, ICE 78 09:18, ICE 79 10:19, ICE 47 11:18, ICE 79 12:18, ICE 78 13:18 … ICE 79 22:18) | GTFS feed | the departures circled on screen |
| 林堡南：停 6 分钟，后车越过 / Limburg Süd: a 6-min stop, overtaken | ICE 49 (Frankfurt Hbf 15:01 → Köln Hbf 16:25) stops at Limburg Süd 15:35–15:41; ICE 41 leaves Frankfurt Flughafen at 15:22, after ICE 49 (15:16), and reaches Siegburg/Bonn at 16:00 without stopping at Limburg Süd or Montabaur, while ICE 49 is at Montabaur 15:50/15:51 and reaches Köln at 16:25 | GTFS feed | The order of the two trains changes between Frankfurt Flughafen and Siegburg, and ICE 49's only long stop on the way is the 6 minutes at Limburg Süd; on a line drawn straight between ICE 41's published stops the two lines cross at Limburg Süd at about 15:38. The exact passing point is not published: "overtaken" is drawn from the published times, not from an operator statement. |
| 这一天 179 条运行线：新线 140，河谷 39 | 179 = 140 + 39 | data/graph.json | a train path is one trip's run along one of the two lines (two stops or more); a trip that uses parts of both lines (ICE 45 via Wiesbaden) counts once on each |
| 只画长途列车，没有区域列车和货车 | the feed is long-distance rail only | gtfs.de feed page https://gtfs.de/de/feeds/de_fv/ | title "Schienenfernverkehr Deutschland"; the feed's route names are ICE, IC, EC, ECE, EN and RJ only (long-distance classes) |
| 2026 年 11 月 18 日 星期三 | service day | the film's choice; the feed calendar covers 2026-11-07 to 2026-12-07 | — |

## Checked, not used

- Opening dates in 2002: DB annual report 2002 (DB Netz): line "am 25. Juli 2002 in Betrieb genommen"; passenger shuttle from 1 August 2002 (several secondary sources). Only the year is on screen.
- Journey time Köln–Frankfurt before and after: DB 2017 press release: "Statt 2 Stunden 15 Minuten liegt die Fahrzeit seitdem bei nur noch 76 Minuten." Not used: the film shows the 18 Nov 2026 timetable instead (fastest Köln Hbf → Frankfurt Hbf that day: 65 min, ICE 79 10:34 → 11:39 northbound; 68 min southbound).
- Tunnels: DB 2017: "Die Strecke führt durch insgesamt 30 Tunnel mit einer Gesamtlänge von 47 km." The strip map draws the tunnels OSM has on the measured path (33 pieces, 40.4 km, some tunnels mapped in parts and the path's Köln approach included); no tunnel figure is on screen.
- Gradients up to 4 % (DB "Infrastruktur": "Steigungen bis zu vier Prozent"). Not used.
- Linke Rheinstrecke opened 1844 (Köln–Bonn) to 1859 (Bingerbrück–Mainz), de.wikipedia. Not used.
