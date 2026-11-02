# Synthetic satellite tile

`satellite-tile.png` is a generated 256 × 256 PNG with muted land and water shapes. It contains no imagery from the live provider. Browser tests serve it for every raster-tile request, making map load and camera controls deterministic. Production builds still request the configured satellite imagery source and display its attribution.
