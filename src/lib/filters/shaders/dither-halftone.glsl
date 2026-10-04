/* {{DEFINE}} */

uniform float uDotSize;
uniform float uSpacingMultiplier; // 1.0 = dots can touch at full black, >1.0 = gap between cells
uniform float uStrength;
uniform vec2 uTexSize;
uniform float uRotationSin;
uniform float uRotationCos;
// 0=circle 1=diamond 2=square 3=line 4=cross 5=square+white-dot hybrid
// 6=regular polygon (sides>=4) 7=radial 8=right triangle
uniform int uDotShape;
// radial style only, pixel space
uniform vec2 uRadialLineCenter;
// radial style only. 0 = concentric rings, >0 = spiral
uniform float uRadialSpiralTightness;
// line style only, amplitude as fraction of cell size
uniform float uLineWaveAmplitude;
// line style only, cycles per cell
uniform float uLineWaveFrequency;
// 0 = standard grid. >0 = smin merge radius (cell units) for gooey mode.
uniform float uGooeyness;
// >0.5 = only cells where (x+y) is even participate (checkerboard/quincunx).
// Requires uGooeyness > 0.
uniform float uGooeyCheckerboard;
// shape 5 only: darkness level at which a cell switches from dot to
// filled square with a punched hole, and softness of that switch.
uniform float uSquareDotThreshold;
uniform float uSquareDotSoftness;
// shape 6 only: number of sides, clamped to >= 3. Orientation always
// follows grid rotation (uRotationSin/Cos) - no independent uniform.
uniform float uPolygonSides;
// 1.0 = flip the final dot pattern (ink <-> gap) before quantization
uniform float uInvert;
// shape 6 (polygon, sides>=4) only: max wobble rotation (radians),
// scaled by luma so it grows as the polygon shrinks/lightens.
// Right triangle (sides==3) ignores this, its geometry isn't
// angle-parametric.
uniform float uPolygonWobble;
// Caps radius (fraction of uDotSize) so near-black cells don't reach
// the cell edge - leaves gooeyness room to work. <= 0.0 = uncapped.
uniform float uMaxDotRadius;
// Only for uDotShape==0. Independent per-cell circles (like separate
// canvas arc fills) instead of the merged/gooey pipeline, so dots never
// bridge together. Own output path below; ignores uGooeyness/
// uGooeyCheckerboard/uStrength.
uniform float uIndependentDots;
// Same independent-circle rendering, run once per R/G/B channel at its
// own angle, composited additively on black. Own output path below;
// ignores uPalette/uColorSpace/uInvert/uDotShape/uIndependentDots.
uniform float uChannelSeparation;
// uIndependentDots only. How far the background color gradient reaches
// before capping, independent of uStrength (which can go much wider
// than this needs). Too wide overshoots past mid-tone palette colors
// straight to the lightest one.
uniform float uHaloWidth;

/* {{SHADER_UTILS}} */

const float TWO_PI = 6.2831853;

// uStrength is the smoothstep half-width for every edge in this shader.
// It can legitimately arrive as 0 (the host maps invertDots to
// strengthMax - strength, and strength can sit at strengthMax), and
// smoothstep with edge0 == edge1 is undefined in GLSL - on some drivers
// that shows up as whole cells flickering black/white. Every edge goes
// through this instead of reading uStrength raw.
float strengthAA() {
    return max(uStrength, 1e-4);
}

// Right triangle: a single diagonal edge sweeps across the cell as
// luma changes, pivoting through the exact y=x split at luma=0.5.
// Unlike every other shape here, coverage isn't radius-from-center
// growth - it's an edge translating corner to corner, so luma is
// baked in directly rather than combined via the shared "dist -
// radius" pattern the other shapes use.
//
// threshold=0 at luma=0.5 -> exact half split (two equal triangles).
// threshold sweeps to ±0.7071 at luma=0/1 -> full black / full white,
// the boundary degenerating to a single corner point at each extreme.
// If the corner assignment comes out mirrored from what you expect,
// flip the sign on `diagDist` below.
float rightTriangleDistance(vec2 d, float luma) {
    float diagDist = (d.y - d.x) * 0.70710678;
    float threshold = (1.0 - 2.0 * luma) * 0.70710678;
    return diagDist - threshold;
}

// Regular polygon (sides >= 4), apothem-based distance: radius=0.5
// touches each edge's midpoint, matching the circle convention.
float polygonDistance(vec2 d, float sides, float luma) {
    float s = max(sides, 3.0);
    float wobble = uPolygonWobble * luma;
    float angle = atan(d.y, d.x) + wobble;
    float segment = TWO_PI / s;
    float halfSegment = segment * 0.5;
    float a = mod(angle + halfSegment, segment) - halfSegment;
    return length(d) * cos(a);
}

// Distance from cell center, normalized so 0.5 = touches cell edge for
// every shape. d is in cell units, each component in [-0.5, 0.5). Not
// used for shape 3 (line) per-style dispatch and isn't a simple per-cell-center SDF.
float shapeDistance(vec2 d, int shape, float polySides, float luma) {
    if (shape == 1) {
        return abs(d.x) + abs(d.y); // diamond
    } else if (shape == 2) {
        return max(abs(d.x), abs(d.y)); // square
    } else if (shape == 4) {
        return min(abs(d.x), abs(d.y)); // cross
    } else if (shape == 6) {
        return polygonDistance(d, polySides, luma);
    }
    return length(d); // circle
}

// Natural per-cell radius from luma, clamped by uMaxDotRadius. <= 0.0
// on uMaxDotRadius disables the clamp entirely (see uniform doc above) -
// without this, an unset uniform silently zeroes every dot.
float effectiveRadius(float luma) {
    float natural = (1.0 - luma) * 0.5;
    return uMaxDotRadius > 0.0 ? min(natural, uMaxDotRadius) : natural;
}

vec2 rotateFwd(vec2 p) {
    return vec2(
        p.x * uRotationCos - p.y * uRotationSin,
        p.x * uRotationSin + p.y * uRotationCos
    );
}

vec2 rotateInv(vec2 p) {
    return vec2(
        p.x * uRotationCos + p.y * uRotationSin,
        -p.x * uRotationSin + p.y * uRotationCos
    );
}

// Shared by uIndependentDots and uChannelSeparation. Each candidate
// cell is its own circle; whichever is closest wins outright - no
// smin, no shared soft edge, so dots can't bridge together.
// channelMode < 0: luma-based (dark=big), sampled over white, radius
// matches normal-style sizing (effectiveRadius/uMaxDotRadius).
// channelMode 0/1/2: raw R/G/B (bright=big), sampled over black,
// radius reaches cell corners (0.5*sqrt(2)) so solid channel regions
// still read as fully inked with no merge step to lean on.
// Returns the winning cell's own SDF - callers pick the AA width.
float closestDotSDF(
    vec2 pos, float rotSin, float rotCos, float safeDotSize, float pitch,
    int channelMode, out vec3 outColor
) {
    vec2 rp = vec2(
        pos.x * rotCos - pos.y * rotSin,
        pos.x * rotSin + pos.y * rotCos
    );
    vec2 baseIdx = floor(rp / pitch);

    float bestSDF = 1.0e4;
    vec3 bestColor = channelMode < 0 ? vec3(1.0) : vec3(0.0);

    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            vec2 cellIdx = baseIdx + vec2(float(dx), float(dy));
            vec2 cellCenterRotated = (cellIdx + 0.5) * pitch;
            vec2 cellCenterPixels = vec2(
                cellCenterRotated.x * rotCos + cellCenterRotated.y * rotSin,
                -cellCenterRotated.x * rotSin + cellCenterRotated.y * rotCos
            );
            vec2 cellCenterUV = clamp(cellCenterPixels / uTexSize, 0.0, 1.0);
            vec4 cellTexel = texture2D(uTexture, cellCenterUV);

            vec3 cellColor;
            float radius;
            if (channelMode < 0) {
                cellColor = mix(vec3(1.0), cellTexel.rgb, cellTexel.a);
                radius = effectiveRadius(dot(cellColor, LUMA709));
            } else {
                cellColor = mix(vec3(0.0), cellTexel.rgb, cellTexel.a);
                float value = channelMode == 0 ? cellColor.r : (channelMode == 1 ? cellColor.g : cellColor.b);
                radius = value * 0.70710678 * max(uSpacingMultiplier, 0.01);
            }

            vec2 d = (rp - cellCenterRotated) / safeDotSize;
            float sdf = length(d) - radius;

            if (sdf < bestSDF) {
                bestSDF = sdf;
                bestColor = cellColor;
            }
        }
    }

    outColor = bestColor;
    return bestSDF;
}

// Signed distance (cell units) to the dot edge for cell `cellIdx`,
// sampling color once at that cell's center so radius stays constant
// across the cell. Not used for shape 3/4/5 - see main().
float cellSDF(vec2 rotatedPos, vec2 cellIdx, float safeDotSize, float pitch, out vec3 outColor) {
    vec2 cellCenterRotated = (cellIdx + 0.5) * pitch;
    vec2 cellCenterPixels = rotateInv(cellCenterRotated);
    vec2 cellCenterUV = clamp(cellCenterPixels / uTexSize, 0.0, 1.0);

    vec4 cellTexel = texture2D(uTexture, cellCenterUV);
    outColor = mix(vec3(1.0), cellTexel.rgb, cellTexel.a);

    float luma = dot(outColor, LUMA709);
    float radius = effectiveRadius(luma);

    vec2 d = (rotatedPos - cellCenterRotated) / safeDotSize;
    return shapeDistance(d, uDotShape, uPolygonSides, luma) - radius;
}

// "Square + white dot" hybrid: solid ink square with a hole whose
// radius shrinks as the source darkens, blended against a plain dot by
// luma (lighter cells -> dot, darker cells -> square+hole). Not an SDF,
// so not smin-mergeable - gooey mode is ignored for this shape.
float hybridPattern(vec2 rotatedPos, vec2 cellIdx, float safeDotSize, float pitch, out vec3 outColor) {
    vec2 cellCenterRotated = (cellIdx + 0.5) * pitch;
    vec2 cellCenterPixels = rotateInv(cellCenterRotated);
    vec2 cellCenterUV = clamp(cellCenterPixels / uTexSize, 0.0, 1.0);

    vec4 cellTexel = texture2D(uTexture, cellCenterUV);
    outColor = mix(vec3(1.0), cellTexel.rgb, cellTexel.a);
    float luma = dot(outColor, LUMA709);

    vec2 d = (rotatedPos - cellCenterRotated) / safeDotSize;

    float dotRadius = effectiveRadius(luma);
    float dotDist = length(d) - dotRadius;
    float dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), dotDist);

    float holeRadius = luma * 0.5;
    float holeDist = length(d) - holeRadius;
    float holeMask = 1.0 - smoothstep(-strengthAA(), strengthAA(), holeDist);

    vec2 dSquare = (rotatedPos - cellCenterRotated) / pitch;
    float squareDist = max(abs(dSquare.x), abs(dSquare.y)) - 0.5;
    float squareFill = 1.0 - smoothstep(-strengthAA(), strengthAA(), squareDist);
    float squarePattern = squareFill * (1.0 - holeMask);

    // Avoid edge0==edge1 (undefined) when softness is 0.
    float safeSoftness = max(uSquareDotSoftness, 0.001);
    float darkMask = smoothstep(
        uSquareDotThreshold - safeSoftness,
        uSquareDotThreshold + safeSoftness,
        1.0 - luma
    );

    return mix(dotPattern, squarePattern, darkMask);
}

float smin(float a, float b, float k) {
    if (k <= 0.0) return min(a, b);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Folds one candidate cell's SDF into the running merge. Shared by the
// checkerboard 5x5 search and the plain 3x3/5x5 search below.
void mergeCell(
    vec2 rotatedPos, vec2 cellIdx, float safeDotSize, float pitch, float gooeyness,
    inout float combinedSDF, inout vec3 dotColor, inout bool found
) {
    vec3 neighborColor;
    float sdf = cellSDF(rotatedPos, cellIdx, safeDotSize, pitch, neighborColor);
    if (!found) {
        combinedSDF = sdf;
        dotColor = neighborColor;
        found = true;
    } else {
        float prevSDF = combinedSDF;
        combinedSDF = smin(combinedSDF, sdf, gooeyness);
        if (sdf < prevSDF) dotColor = neighborColor;
    }
}

// Manual mod-2 for checkerboard parity (avoids a driver bug in mod()
// with small integer divisors on some mobile GPUs).
float mod2(float x) {
    return x - 2.0 * floor(x * 0.5);
}

const float PARITY_EPS = 1e-4;

// Nudges the quantization search coordinate off exact float ties (e.g.
// pure black source + uncovered background lands exactly halfway
// between two palette entries). Direction already matches the coverage
// model: background tips lighter, full coverage tips darker.
const float TIE_BREAK_SCALE = 1.0001;

void main() {
    vec4 texel = texture2D(uTexture, vTexCoord);

    if (uDotShape == 0 && uChannelSeparation > 0.5) {
        // Own pipeline start to finish: three independent circle grids
        // (one per channel, own screen angle), additive on black,
        // written out directly. Everything below (palette, dot shapes,
        // gooeyness, invert) belongs to the other pipeline and doesn't
        // apply here.
        float safeDotSize = max(uDotSize, 1.0);
        float pitch = safeDotSize * max(uSpacingMultiplier, 0.01);
        vec2 pos = vTexCoord * uTexSize;

        // Fixed relative screen angles, same spirit as CMY print
        // screening (e.g. C15/M75/Y0): no pair 90 degrees apart, so no
        // two channels can moire against each other.
        vec3 unused;
        float aR = radians(15.0);
        float aG = radians(75.0);
        float aB = radians(0.0);
        float aa = 1.0 / safeDotSize;

        float sdfR = closestDotSDF(
            pos,
            uRotationSin * cos(aR) + uRotationCos * sin(aR),
            uRotationCos * cos(aR) - uRotationSin * sin(aR),
            safeDotSize, pitch, 0, unused
        );
        float sdfG = closestDotSDF(
            pos,
            uRotationSin * cos(aG) + uRotationCos * sin(aG),
            uRotationCos * cos(aG) - uRotationSin * sin(aG),
            safeDotSize, pitch, 1, unused
        );
        float sdfB = closestDotSDF(
            pos,
            uRotationSin * cos(aB) + uRotationCos * sin(aB),
            uRotationCos * cos(aB) - uRotationSin * sin(aB),
            safeDotSize, pitch, 2, unused
        );
        float patR = 1.0 - smoothstep(-aa, aa, sdfR);
        float patG = 1.0 - smoothstep(-aa, aa, sdfG);
        float patB = 1.0 - smoothstep(-aa, aa, sdfB);

        vec3 dotColor = clamp(vec3(patR, patG, patB), 0.0, 1.0);

        #ifdef USE_LAB
            vec3 pixelLab = srgbToLab(dotColor);
            vec3 closest = findClosest(pixelLab);
        #elif defined(USE_OKLAB)
            vec3 pixelOklab = srgbToOklab(dotColor);
            vec3 closest = findClosest(pixelOklab);
        #else
            vec3 closest = findClosest(dotColor);
        #endif

        gl_FragColor = vec4(closest, texel.a < 0.001 ? 0.0 : 1.0);
        return;
    }

    if (uDotShape == 0 && uIndependentDots > 0.5) {
        float safeDotSize = max(uDotSize, 1.0);
        float pitch = safeDotSize * max(uSpacingMultiplier, 0.01);
        vec2 pos = vTexCoord * uTexSize;

        vec3 cellColor;
        float sdf = closestDotSDF(pos, uRotationSin, uRotationCos, safeDotSize, pitch, -1, cellColor);

        // Coverage: how far ink actually extends. Stays a narrow ~1px
        // edge - this is what keeps dots from bridging into blobs.
        float aa = 1.0 / safeDotSize;
        float coverage = 1.0 - smoothstep(-aa, aa, sdf);
        if (uInvert > 0.5) coverage = 1.0 - coverage;

        // Ink color: rim-to-core gradient over uStrength's width - safe
        // to use the full width since coverage above already keeps this
        // confined to each dot's own interior.
        //
        // Background color: same idea, but capped to a fixed max width
        // regardless of uStrength (which can go far past what a halo
        // this shape needs). A fixed max-light shift overshoots past
        // any mid-tone palette entry straight to white - shifting only
        // this far keeps the color close enough to the source hue to
        // land on the right palette color instead.
        float depth = 1.0 - smoothstep(-strengthAA(), strengthAA(), sdf);
        float haloWidth = max(min(strengthAA(), uHaloWidth), 0.001);
        float haloDepth = 1.0 - smoothstep(-haloWidth, haloWidth, sdf);
        #ifdef USE_LAB
            vec3 cellLab = srgbToLab(cellColor);
            vec3 inkLab = vec3(clamp(cellLab.x + (0.5 - depth) * 100.0 * TIE_BREAK_SCALE, 0.0, 100.0), cellLab.yz);
            vec3 bgLab = vec3(clamp(cellLab.x + (0.5 - haloDepth) * 100.0 * TIE_BREAK_SCALE, 0.0, 100.0), cellLab.yz);
            vec3 inkColor = findClosest(inkLab);
            vec3 bgColor = findClosest(bgLab);
        #elif defined(USE_OKLAB)
            vec3 cellOklab = srgbToOklab(cellColor);
            vec3 inkOklab = vec3(clamp(cellOklab.x + (0.5 - depth) * TIE_BREAK_SCALE, 0.0, 1.0), cellOklab.yz);
            vec3 bgOklab = vec3(clamp(cellOklab.x + (0.5 - haloDepth) * TIE_BREAK_SCALE, 0.0, 1.0), cellOklab.yz);
            vec3 inkColor = findClosest(inkOklab);
            vec3 bgColor = findClosest(bgOklab);
        #else
            vec3 inkColor = findClosest(clamp(cellColor + (0.5 - depth) * TIE_BREAK_SCALE, 0.0, 1.0));
            vec3 bgColor = findClosest(clamp(cellColor + (0.5 - haloDepth) * TIE_BREAK_SCALE, 0.0, 1.0));
        #endif

        gl_FragColor = vec4(mix(bgColor, inkColor, coverage), texel.a < 0.001 ? 0.0 : 1.0);
        return;
    }

    float safeDotSize = max(uDotSize, 1.0);
    float pitch = safeDotSize * max(uSpacingMultiplier, 0.01);
    vec2 pos = vTexCoord * uTexSize;
    vec2 rotatedPos = rotateFwd(pos);
    vec2 baseCellIdx = floor(rotatedPos / pitch);

    bool checkerboard = uDotShape == 0 && uGooeyCheckerboard > 0.5;

    float dotPattern;
    vec3 dotColor;

    if (uDotShape == 4) {
        // Cross samples per-fragment instead of per-cell-center, so
        // brightness varies continuously across the mark - a deliberate
        // look choice. Gooeyness/checkerboard are ignored here, same
        // as shapes 3/5.
        vec2 lineCellCenter = (baseCellIdx + 0.5) * pitch;
        vec2 d = (rotatedPos - lineCellCenter) / safeDotSize;

        dotColor = mix(vec3(1.0), texel.rgb, texel.a);
        float luma = dot(dotColor, LUMA709);
        float radius = effectiveRadius(luma);
        float dist = shapeDistance(d, uDotShape, uPolygonSides, luma);
        dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), dist - radius);
    } else if (uDotShape == 3 || uDotShape == 7) {
        // Line samples per-fragment (required, spans the full cell -
        // and for radial style, cells aren't Cartesian anyway).
        // Gooeyness/checkerboard are ignored here, same as shapes 4/5.
        dotColor = mix(vec3(1.0), texel.rgb, texel.a);
        float luma = dot(dotColor, LUMA709);
        float radius = effectiveRadius(luma);
        float dist;
        if (uDotShape == 7) {
            vec2 toCenter = pos - uRadialLineCenter;
            float r = length(toCenter);
            float theta = atan(toCenter.y, toCenter.x);
            float spiralR = r - theta * pitch * uRadialSpiralTightness / TWO_PI;
            float ringIdx = floor(spiralR / pitch);
            float ringCenter = (ringIdx + 0.5) * pitch;
            dist = abs(spiralR - ringCenter) / safeDotSize;
        } else {
            vec2 lineCellCenter = (baseCellIdx + 0.5) * pitch;
            vec2 d = (rotatedPos - lineCellCenter) / safeDotSize;

            float wavePhase = rotatedPos.x / pitch; // continuous across the whole image
            // float wave = uLineWaveAmplitude * sin(wavePhase * uLineWaveFrequency * TWO_PI);
            float wave = uLineWaveAmplitude * (4.0 * abs(fract(wavePhase * uLineWaveFrequency) - 0.5) - 1.0);
            dist = abs(d.y - wave);
        }

        dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), dist - radius);
    } else if (uDotShape == 8) {
        // Unbounded diagonal line, not a centered field like every
        // other shape - the generic neighbor-merge search below would
        // leak an adjacent cell's line into this one. Single-cell only,
        // same reasoning as line/cross/hybrid above. No gooeyness/
        // checkerboard for the same reason.
        vec2 cellCenterRotated = (baseCellIdx + 0.5) * pitch;
        vec2 cellCenterPixels = rotateInv(cellCenterRotated);
        vec2 cellCenterUV = clamp(cellCenterPixels / uTexSize, 0.0, 1.0);
        vec4 cellTexel = texture2D(uTexture, cellCenterUV);
        dotColor = mix(vec3(1.0), cellTexel.rgb, cellTexel.a);

        float luma = dot(dotColor, LUMA709);
        vec2 d = (rotatedPos - cellCenterRotated) / safeDotSize;
        float dist = rightTriangleDistance(d, luma);
        dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), dist);
    } else if (uDotShape == 5) {
        dotPattern = hybridPattern(rotatedPos, baseCellIdx, safeDotSize, pitch, dotColor);
    } else if (checkerboard) {
        // Half-density active cells need a 5x5 search to guarantee
        // finding one even when the home cell itself is skipped, so
        // canSkip's early-out doesn't apply here. Manually unrolled to
        // avoid a nested-loop miscompile seen on some mobile GPUs.
        float baseParity = mod2(baseCellIdx.x + baseCellIdx.y + PARITY_EPS);

        float combinedSDF = 1.0e4;
        dotColor = vec3(1.0);
        bool found = false;

        #define TRY_CELL(DX, DY) \
            if (mod2(baseParity + float((DX) + (DY))) <= 0.5) { \
                mergeCell(rotatedPos, baseCellIdx + vec2(float(DX), float(DY)), safeDotSize, pitch, uGooeyness, combinedSDF, dotColor, found); \
            }

        TRY_CELL(-2, -2) TRY_CELL(-2, -1) TRY_CELL(-2, 0) TRY_CELL(-2, 1) TRY_CELL(-2, 2)
        TRY_CELL(-1, -2) TRY_CELL(-1, -1) TRY_CELL(-1, 0) TRY_CELL(-1, 1) TRY_CELL(-1, 2)
        TRY_CELL( 0, -2) TRY_CELL( 0, -1) TRY_CELL( 0, 0) TRY_CELL( 0, 1) TRY_CELL( 0, 2)
        TRY_CELL( 1, -2) TRY_CELL( 1, -1) TRY_CELL( 1, 0) TRY_CELL( 1, 1) TRY_CELL( 1, 2)
        TRY_CELL( 2, -2) TRY_CELL( 2, -1) TRY_CELL( 2, 0) TRY_CELL( 2, 1) TRY_CELL( 2, 2)

        #undef TRY_CELL

        dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), combinedSDF);
    } else {
        // Chebyshev distance to this cell's edge, in cell/pitch units
        // (0.5 = exactly on the edge). Previously divided by
        // safeDotSize instead of pitch, which only happens to equal
        // pitch when uSpacingMultiplier==1 - anywhere else (gaps or
        // overlap between cells) the "edge" it measured against wasn't
        // the real grid edge, so canSkip could fire at the wrong place
        // and leave a faint square seam along the cell grid.
        vec2 dHome = (rotatedPos - (baseCellIdx + 0.5) * pitch) / pitch;
        float edgeDist = 0.5 - max(abs(dHome.x), abs(dHome.y));
        float homeSDF = cellSDF(rotatedPos, baseCellIdx, safeDotSize, pitch, dotColor);

        // Skip the neighbor search when no neighbor could change the
        // outcome: fragment is far from the cell edge, or home is
        // already fully saturated. Only valid for plain min (gooeyness
        // <= 0) - smin can dip below min(a,b), so gooey mode always
        // needs the full search. Also only valid when cells don't
        // overlap on their own (uSpacingMultiplier >= 1) - below that,
        // a single dot's natural radius can already reach past its own
        // cell with zero gooeyness involved, so edgeDist alone can't
        // be trusted there (see use5x5 below).
        bool canSkip = uGooeyness <= 0.0 && uSpacingMultiplier >= 1.0
            && (edgeDist > strengthAA() || homeSDF <= -strengthAA());

        // Cells closer together than one dot-size (uSpacingMultiplier
        // < 1) can have a single dot's natural radius alone - no
        // gooeyness needed - reach past the immediate 3x3 ring, so that
        // needs the wider search too, not just high gooeyness.
        bool use5x5 = uGooeyness > 0.5 || uSpacingMultiplier < 1.0;

        if (canSkip) {
            dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), homeSDF);
        } else if (!use5x5) {
            // Merge radius (uGooeyness, cell units) can't bridge past
            // its own size - below the threshold above, neither smin
            // nor natural radius overlap reaches a second ring of
            // neighbors, so the immediate 3x3 is still sufficient.
            float combinedSDF = homeSDF;
            bool found = true;

            #define TRY_CELL3(DX, DY) \
                mergeCell(rotatedPos, baseCellIdx + vec2(float(DX), float(DY)), safeDotSize, pitch, uGooeyness, combinedSDF, dotColor, found);

            TRY_CELL3(-1, -1) TRY_CELL3(-1, 0) TRY_CELL3(-1, 1)
            TRY_CELL3( 0, -1)                  TRY_CELL3( 0, 1)
            TRY_CELL3( 1, -1) TRY_CELL3( 1, 0) TRY_CELL3( 1, 1)

            #undef TRY_CELL3

            dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), combinedSDF);
        } else {
            // Above the threshold, cells can bridge past the immediate
            // ring - without widening the search, bridging silently
            // caps out at "touching neighbors only" no matter how high
            // gooeyness is set, or how tightly cells overlap. Matches
            // the checkerboard branch's existing 5x5 reach above.
            float combinedSDF = homeSDF;
            bool found = true;

            #define TRY_CELL5(DX, DY) \
                mergeCell(rotatedPos, baseCellIdx + vec2(float(DX), float(DY)), safeDotSize, pitch, uGooeyness, combinedSDF, dotColor, found);

            TRY_CELL5(-2, -2) TRY_CELL5(-2, -1) TRY_CELL5(-2, 0) TRY_CELL5(-2, 1) TRY_CELL5(-2, 2)
            TRY_CELL5(-1, -2) TRY_CELL5(-1, -1) TRY_CELL5(-1, 0) TRY_CELL5(-1, 1) TRY_CELL5(-1, 2)
            TRY_CELL5( 0, -2) TRY_CELL5( 0, -1)                  TRY_CELL5( 0, 1) TRY_CELL5( 0, 2)
            TRY_CELL5( 1, -2) TRY_CELL5( 1, -1) TRY_CELL5( 1, 0) TRY_CELL5( 1, 1) TRY_CELL5( 1, 2)
            TRY_CELL5( 2, -2) TRY_CELL5( 2, -1) TRY_CELL5( 2, 0) TRY_CELL5( 2, 1) TRY_CELL5( 2, 2)

            #undef TRY_CELL5

            dotPattern = 1.0 - smoothstep(-strengthAA(), strengthAA(), combinedSDF);
        }
    }

    if (uInvert > 0.5) {
        dotPattern = 1.0 - dotPattern;
    }

    // Quantize. Perceptual spaces shift lightness only, keeping hue/
    // chroma stable at dot edges; plain RGB uses an additive shift.
    #ifdef USE_LAB
        vec3 pixelLab = srgbToLab(dotColor);
        pixelLab.x = clamp(pixelLab.x + (0.5 - dotPattern) * 100.0 * TIE_BREAK_SCALE, 0.0, 100.0);
        vec3 closest = findClosest(pixelLab);
    #elif defined(USE_OKLAB)
        vec3 pixelOklab = srgbToOklab(dotColor);
        pixelOklab.x = clamp(pixelOklab.x + (0.5 - dotPattern) * 1.0 * TIE_BREAK_SCALE, 0.0, 1.0);
        vec3 closest = findClosest(pixelOklab);
    #else
        vec3 searchSpaceCoords = clamp(dotColor + (0.5 - dotPattern) * TIE_BREAK_SCALE, 0.0, 1.0);
        vec3 closest = findClosest(searchSpaceCoords);
    #endif

    gl_FragColor = vec4(closest, texel.a);
}
