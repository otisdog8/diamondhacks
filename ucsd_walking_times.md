# UCSD Campus Walking Times Reference

## Purpose
Use this data to estimate walking transit time between locations on the UC San Diego campus. Add the estimated minutes as buffer time between back-to-back calendar events at different locations.

## Data Source
Walking times sourced from the **Google Maps Distance Matrix API** (walking mode). These reflect actual pedestrian routes, paths, stairs, and elevation changes on campus — not straight-line estimates.

## Quick-Reference Rules of Thumb
- Same building or adjacent buildings: 1–3 min
- Within the same college cluster: 3–7 min
- Across 1–2 college boundaries: 8–14 min
- Opposite ends of campus (Revelle ↔ Seventh/Village): 18–30 min
- Add +2 min during peak class-change periods (:50–:00 transitions).

## Walking Time Matrix: Lecture Hall ↔ Lecture Hall (minutes)

| |WLH|Center|Ledden|Jeannie|Solis|Galbraith|York|Mosaic|Peterson|Mandeville|PepCanyon|CSB|FAH|CSE|RWAC|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|**WLH**|—|9|13|11|9|18|19|12|10|9|4|10|7|3|11|
|**Center**|8|—|8|8|9|12|12|9|9|4|8|9|12|10|8|
|**Ledden**|12|7|—|3|7|12|13|2|5|5|12|8|15|13|4|
|**Jeannie**|10|7|2|—|5|11|12|1|3|4|12|6|14|11|2|
|**Solis**|8|8|7|5|—|14|16|6|3|7|10|1|12|10|4|
|**Galbraith**|16|11|11|11|14|—|4|12|12|10|17|15|20|18|12|
|**York**|18|11|13|13|16|5|—|13|14|12|17|17|22|20|13|
|**Mosaic**|11|8|2|2|6|12|13|—|4|5|13|7|15|12|3|
|**Peterson**|8|8|5|3|3|12|13|4|—|5|10|4|12|10|4|
|**Mandeville**|8|3|5|5|7|11|12|5|5|—|9|7|12|10|5|
|**PepCanyon**|4|9|14|14|12|19|18|14|12|10|—|12|10|7|14|
|**CSB**|8|8|8|6|1|15|16|6|4|7|10|—|12|10|4|
|**FAH**|7|13|18|16|14|23|24|17|15|14|11|14|—|4|16|
|**CSE**|4|10|15|13|11|20|21|14|12|11|8|12|4|—|13|
|**RWAC**|10|7|4|2|3|12|13|3|4|5|12|4|13|12|—|

## Walking Time Matrix: Residence → Lecture Hall (minutes)

| |WLH|Center|Ledden|Jeannie|Solis|Galbraith|York|Mosaic|Peterson|Mandeville|PepCanyon|CSB|FAH|CSE|RWAC|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|**Revelle**|15|10|10|10|13|3|6|10|11|9|16|13|19|17|10|
|**Muir**|13|10|4|4|9|12|13|3|7|8|15|9|17|15|6|
|**Sixth**|13|10|4|4|7|14|15|2|6|7|15|7|17|14|5|
|**Marshall**|15|14|8|8|8|18|19|7|9|11|18|9|17|17|8|
|**ERC**|17|18|12|12|11|22|23|10|12|15|21|11|16|18|11|
|**WarrenRes**|8|15|20|17|16|24|26|18|16|16|12|16|4|5|18|
|**Seventh**|20|22|16|15|15|25|27|14|16|19|24|15|19|21|14|
|**Village**|20|22|16|15|15|25|27|14|16|18|24|15|18|20|14|
|**I-House**|16|15|9|9|8|20|21|8|9|13|18|9|14|16|8|

## Walking Time Matrix: Residence ↔ Residence (minutes)

| |Revelle|Muir|Sixth|Marshall|ERC|WarrenRes|Seventh|Village|I-House|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|**Revelle**|—|9|12|16|20|21|23|23|18|
|**Muir**|9|—|4|8|11|19|15|15|9|
|**Sixth**|12|4|—|5|8|18|12|12|6|
|**Marshall**|16|8|5|—|5|19|9|9|3|
|**ERC**|20|12|9|6|—|18|5|5|4|
|**WarrenRes**|23|20|20|21|19|—|22|22|18|
|**Seventh**|23|15|12|10|5|21|—|1|8|
|**Village**|23|15|12|9|5|21|1|—|8|
|**I-House**|18|9|6|3|3|17|7|7|—|

## Walking Time Matrix: Key Landmarks (minutes)

| |WLH|Center|Ledden|Jeannie|Solis|Galbraith|York|Mosaic|Peterson|Mandeville|PepCanyon|CSB|FAH|CSE|RWAC|Revelle|Muir|Sixth|Marshall|ERC|WarrenRes|Seventh|Village|I-House|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|**Geisel**|6|6|8|6|4|15|17|7|5|7|9|4|10|8|7|14|9|9|12|14|12|17|17|12|
|**Price**|4|4|9|9|8|14|15|10|8|5|5|8|10|7|9|13|12|12|15|18|11|22|22|16|

## Building Aliases & Coordinates

- **CSE** = CSE Building (32.88180, -117.23352)
- **Center** = Center Hall (32.87755, -117.23741)
- **CSB** = Cognitive Science Building (CSB) (32.88058, -117.23954)
- **ERC** = ERC (Eleanor Roosevelt) (32.88514, -117.24288)
- **FAH** = Franklin Antonio Hall (FAH) (32.88350, -117.23491)
- **Galbraith** = Galbraith Hall (32.87363, -117.24124)
- **Geisel** = Geisel Library (32.88118, -117.23759)
- **I-House** = International House (32.88402, -117.24217)
- **Jeannie** = Jeannie Hall (NTPLL) (32.87987, -117.24120)
- **Ledden** = Ledden Auditorium (York Hall) (32.87886, -117.24169)
- **Mandeville** = Mandeville Auditorium (32.87783, -117.23943)
- **Marshall** = Marshall Res Halls (32.88300, -117.24267)
- **Mosaic** = Mosaic Hall (NTPLL) (32.87992, -117.24192)
- **Muir** = Muir College (Tioga Hall) (32.87904, -117.24337)
- **PepCanyon** = Pepper Canyon Hall (32.87838, -117.23376)
- **Peterson** = Peterson Hall (32.87997, -117.24024)
- **Price** = Price Center (32.87957, -117.23647)
- **RWAC** = RWAC (Ridge Walk) (32.88039, -117.24107)
- **Revelle** = Revelle College Res Halls (32.87497, -117.24172)
- **Seventh** = Seventh College Res (32.88804, -117.24254)
- **Sixth** = Sixth College Res Hall (32.88057, -117.24283)
- **Solis** = Solis Hall (32.88091, -117.23978)
- **Village** = The Village (upper-div) (32.88796, -117.24255)
- **WarrenRes** = Warren College Res (32.88400, -117.23325)
- **WLH** = Warren Lecture Hall (WLH) (32.88059, -117.23442)
- **York** = York Hall (32.87424, -117.23993)

## Usage Notes for Calendar Buffer

1. Look up `from` and `to` buildings in the appropriate matrix.
2. The cell value is the Google Maps estimated walking time in minutes.
3. Add this as buffer/travel time between consecutive calendar events.
4. Add +2 min for peak class-change rush or if you need to find a seat.
5. If the exact room is unknown, the building-level estimate is accurate to ±1 min.

---
*Generated via Google Maps Distance Matrix API (walking mode).*