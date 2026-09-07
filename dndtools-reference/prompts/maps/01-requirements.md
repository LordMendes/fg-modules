# 01. Requirements

Player-facing map features, mapped from Roll20 and Fantasy Grounds onto this VTT. Wave numbers are the implementation order.

M = must in that wave. S = should if time. L = later / Wave 4+. X = out of scope.

## Scene and sharing

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| Upload battlemap image | Page image | Image record | 1 | M |
| Name and list scenes | Page toolbar | Images list | 1 | M |
| One live scene for the party | Yellow ribbon | Share sheet | 1 | M |
| Duplicate scene | Duplicate page | Duplicate record | 4 | L |
| Identified vs player-facing name | No | Unidentified name | 4 | L |
| Multiple maps open at once | No (one page) | Windows | X | One live scene |

## Board chrome

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| Pan / zoom | Yes | Yes | 1 | M |
| Fit map to view | Implicit | Zoom extents | 1 | M |
| Ping | Hold click | Ping mode | 1 | M |
| GM force-camera (Shift-ping) | Shift-ping | Shift-ping | 1 | M |
| Grid overlay show/hide | Page settings | Toggle grid | 1 | M |
| Calibrate grid (px, offset) | Align tool | Set grid with mouse | 1 | M |
| Square grid | Yes | Yes | 1 | M |
| Hex / isometric | Yes | Yes | 4 | L |
| Scale (ft per square) | Page settings | Options | 1 | M |
| Diagonal rule | 5e / 3.5e / euclid | Campaign option | 1 | M |

## Tokens

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| Place PC token from roster | Represent character | Drag from CT | 1 | M |
| Place NPC / generic token | Any image | CT / assets | 1 | M |
| Player moves own token | Controlled By | Owner | 1 | M |
| Grid snap, size in squares | Yes | Yes | 1 | M |
| Rotate | Yes | Yes | 1 | M |
| Nameplate | Yes | Yes | 1 | M |
| GM-hidden layer | GM overlay | Always invisible | 2 | M |
| Mask-sensitive NPC visibility | FoW | Mask-sensitive | 2 | M |
| HP / condition bars | 3 bars + markers | CT | 4 | S |
| Auras | 2 auras | Pointers | 4 | L |
| Targeting arrows | Limited | Target mode | 4 | L |
| Token lock (GM approves move) | No | Yes | 4 | L |
| Click token opens sheet | Shift/Alt double-click | Yes | 1 | S (own PC) |

## Fog, drawing, measure

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| Manual hide / reveal polygons | FoW / Darkness | Global mask | 2 | M |
| Reset fog | Yes | Yes | 2 | M |
| Player drawing | Draw tools | Play drawing | 2 | M |
| GM clear drawings | Clear layer | Eraser | 2 | M |
| Measure ruler (shared or private) | Measure tool | Pointers | 1 | M |
| AOE cone / circle / square | Measure shapes | Pointers | 2 | M |
| Text labels on map | Text tool | Text mode | 4 | S |
| Pins / shortcuts | Place pin | Shortcuts | 4 | L |

## Vision and lighting

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| Wall polylines | Lighting layer | LOS wall | 3 | M |
| Doors open / close / lock | Limited | Door mode | 3 | M |
| Token has vision | Has Vision | Token vision | 3 | M |
| Vision range from sheet | Token settings | Senses field | 3 | M (default if no senses) |
| Explorer memory (seen = gray) | Explorer Mode | Token FoW | 3 | S |
| Restrict move through walls | Page setting | LOS | 3 | M |
| Windows, terrain, secret, illusion | No / scripts | Typed LOS | 4 | M (in 4) |
| Peek (vision past wall thickness) | No | Peek | 4 | S |
| Daylight / ambient | Daylight Mode | Ambient + shadows | 4 | M |
| Area lights on map | Light tokens | Add Light | 4 | M |
| Token-carried light | Emits Light | Token Light / effects | 4 | M |
| Colored / directional lights | Yes | Intensity, color | 4 | S |
| Darkness as inverted light | Permanent darkness | Light as darkness | 4 | L |

## Map building and import

| Feature | Roll20 | FG | Wave | Us |
|---|---|---|---|---|
| PNG / WebP / JPEG upload | Yes | Yes | 1 | M |
| UVTT / DD2VTT import (grid, walls, lights) | Marketplace / mods | Native | 3 | M |
| In-app tile / brush map painter | Draw on map layer | Paint / tiles | X | Use external tools |
| Weather / skybox / 3D camera | FX (limited) | FX, 3D views | X | Out |
| Foreground roofs | Foreground layer | Objects | 4 | L |

## Explicitly out of scope

- Building dungeons inside the VTT (FG Paint, stamps, image-as-brush).
- 2.5D / 3D token camera and skybox.
- Voice, video, or cursor-follow of other players (pings are enough).
- Roll20 character-sheet macros bound to tokens.
- Hex labels, isometric grids (until someone asks after Wave 4).
- Server-authoritative physics. Collision is "can't end a move inside a wall," not continuous simulation.
