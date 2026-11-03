# Animation rendering

`flightGeometry.ts` and `MissileCanvasRenderer.ts` reproduce the carrier route, glow, target reticle, and exhaust on a transparent Canvas. The map controller supplies immutable launch data and elapsed milliseconds. The route is geographic after the click; camera projection happens only while drawing.

`blastTiming.ts` exports the shared normalized fast-first expansion curve used by the 2D field and 3D dome. `fireballGeometry.ts` exports `fireballEnvelope`, `hemisphereVertices`, `localMercatorMatrix`, `groundMetersPerPixel`, and `fireballMeshDetail`. These functions consume normalized progress, geographic degrees, kilometers, CSS pixels, or MapLibre zoom as documented and require no browser or GPU. The hemisphere has equal modeled horizontal radius and vertical height; double-precision translation is completed before its matrix is uploaded as Float32.

`FireballRenderer` owns only a small WebGL2 program, two hemisphere buffers, and a separate transparent canvas. MapLibre's custom layer calls `render` with its current camera matrix, so pan, zoom, pitch, and world wrapping move the dome with ground zero. A missing context, shader failure, or layer failure logs a developer warning and leaves the Canvas 2D field and flash usable. Reset and replacement clear the dome immediately; disposal releases GPU buffers and event listeners. The procedural surface texture is illustrative light, not a physical temperature or radiation model.

This area depends on application launch data and pure domain coordinates only through its rendering inputs. It never changes physical effect radii or application phase.
