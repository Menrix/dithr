/* {{DEFINE}} */

uniform vec2 uTexSize;
uniform float uStrength;
uniform int uMatrixSize;
uniform int uPixelSize;

/* {{SHADER_UTILS}} */

void main() {
    vec2 blockSize = uTexSize * float(uPixelSize);
    vec2 snappedCoord = (floor(vTexCoord / blockSize) + 0.5) * blockSize;

    vec4 texel = texture2D(uTexture, snappedCoord);
    vec3 flattenedRgb = mix(vec3(1.0), texel.rgb, texel.a);

    // Pre-jitter check: if flattenedRgb already matches a palette color,
    // skip dithering entirely. Prevents ordered-dither noise on flat
    // regions that need no quantization.
    #ifdef USE_LAB
        vec3 preSpace = srgbToLab(flattenedRgb);
    #elif defined(USE_OKLAB)
        vec3 preSpace = srgbToOklab(flattenedRgb);
    #else
        vec3 preSpace = flattenedRgb;
    #endif
    vec3 preClosest = findClosest(preSpace);

    const float EPS = 0.5 / 255.0;
    if (distance(flattenedRgb, preClosest) < EPS) {
        gl_FragColor = vec4(preClosest, texel.a == 0.0 ? 0.0 : 1.0);
        return;
    }

    int x = int(gl_FragCoord.x) / uPixelSize;
    int y = int(gl_FragCoord.y) / uPixelSize;

    int px = intMod(x, uMatrixSize);
    int py = intMod(y, uMatrixSize);
    int idx = py * uMatrixSize + px;

    float threshold = 0.0;
    float nSquared = float(uMatrixSize * uMatrixSize);

    if (uMatrixSize == 2) {
        // Manual lookup ladder to avoid variable indexing errors
        if      (idx == 0) threshold = 0.0;
        else if (idx == 1) threshold = 2.0;
        else if (idx == 2) threshold = 3.0;
        else               threshold = 1.0;
    } else if (uMatrixSize == 3) {
        if      (idx == 0) threshold = 1.0;
        else if (idx == 1) threshold = 4.0;
        else if (idx == 2) threshold = 7.0;
        else if (idx == 3) threshold = 6.0;
        else if (idx == 4) threshold = 0.0;
        else if (idx == 5) threshold = 2.0;
        else if (idx == 6) threshold = 3.0;
        else if (idx == 7) threshold = 8.0;
        else               threshold = 5.0;
    } else if (uMatrixSize == 4) {
        if      (idx == 0)  threshold = 0.0;
        else if (idx == 1)  threshold = 8.0;
        else if (idx == 2)  threshold = 2.0;
        else if (idx == 3)  threshold = 10.0;
        else if (idx == 4)  threshold = 12.0;
        else if (idx == 5)  threshold = 4.0;
        else if (idx == 6)  threshold = 14.0;
        else if (idx == 7)  threshold = 6.0;
        else if (idx == 8)  threshold = 3.0;
        else if (idx == 9)  threshold = 11.0;
        else if (idx == 10) threshold = 1.0;
        else if (idx == 11) threshold = 9.0;
        else if (idx == 12) threshold = 15.0;
        else if (idx == 13) threshold = 7.0;
        else if (idx == 14) threshold = 13.0;     
        else                threshold = 5.0;
    } else if (uMatrixSize == 8) {
        // Level 1 (2x2)
        int x1 = intMod(x, 2);
        int y1 = intMod(y, 2);
        if (x1 == 1 && y1 == 0)      threshold += 32.0;
        else if (x1 == 0 && y1 == 1) threshold += 48.0;
        else if (x1 == 1 && y1 == 1) threshold += 16.0;

        // Level 2 (4x4)
        int x2 = intMod(x / 2, 2);
        int y2 = intMod(y / 2, 2);
        if (x2 == 1 && y2 == 0)      threshold += 8.0;
        else if (x2 == 0 && y2 == 1) threshold += 12.0;
        else if (x2 == 1 && y2 == 1) threshold += 4.0;

        // Level 3 (8x8)
        int x3 = intMod(x / 4, 2);
        int y3 = intMod(y / 4, 2);
        if (x3 == 1 && y3 == 0)      threshold += 2.0;
        else if (x3 == 0 && y3 == 1) threshold += 3.0;
        else if (x3 == 1 && y3 == 1) threshold += 1.0;
    }

    // Centering
    float jitter = (threshold / nSquared) - 0.5;

    vec3 searchSpaceCoords = clamp(flattenedRgb + (jitter * uStrength), 0.0, 1.0);
    #ifdef USE_LAB
        vec3 pixelLab = srgbToLab(searchSpaceCoords);
        vec3 closest = findClosest(pixelLab);
    #elif defined(USE_OKLAB)
        vec3 pixelLab = srgbToOklab(searchSpaceCoords);
        vec3 closest = findClosest(pixelLab);
    #else
        vec3 closest = findClosest(searchSpaceCoords);
    #endif

    gl_FragColor = vec4(closest, texel.a);
}
