/* {{DEFINE}} */

uniform float uStepW;
uniform float uStepH;
uniform float uCellSize;
uniform float uJitter;
uniform float uLightStrength;
uniform float uRotation;
uniform float uMode; // 0.0 = lowpoly, 1.0 = pixelate, 2.0 = hexagon, 3.0 = crystallize
uniform float uGridGap;

float rectGapAlpha(vec2 rPixel, float cellSize, float gap){
    if (gap <= 0.0) return 1.0;
    vec2 local = mod(rPixel, cellSize) - cellSize * 0.5;
    float edgeDist = cellSize * 0.5 - max(abs(local.x), abs(local.y));
    return smoothstep(-0.5, 0.5, edgeDist - gap * 0.5);
}

float distToSegment(vec2 p, vec2 a, vec2 b){
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * t);
}

float triGapAlpha(vec2 gv, bool upper, float cellSize, float gap){
    if (gap <= 0.0) return 1.0;
    float d;
    if (upper) {
        d = min(min(distToSegment(gv, vec2(0.0,0.0), vec2(1.0,0.0)),
                     distToSegment(gv, vec2(1.0,0.0), vec2(1.0,1.0))),
                 distToSegment(gv, vec2(0.0,0.0), vec2(1.0,1.0)));
    } else {
        d = min(min(distToSegment(gv, vec2(0.0,0.0), vec2(0.0,1.0)),
                     distToSegment(gv, vec2(0.0,1.0), vec2(1.0,1.0))),
                 distToSegment(gv, vec2(0.0,0.0), vec2(1.0,1.0)));
    }
    return smoothstep(-0.5, 0.5, d * cellSize - gap * 0.5);
}

// Edge==0.5 traces the hex boundary for the r=(1.0, 1.7320508) lattice used by hexCenter.
float hexDist(vec2 p){
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

float hexGapAlpha(vec2 gv, float cellSize, float gap){
    if (gap <= 0.0) return 1.0;
    float edgePixels = (0.5 - hexDist(gv)) * cellSize;
    return smoothstep(-0.5, 0.5, edgePixels - gap * 0.5);
}

// Distance to Voronoi bisector ~= (secondNearest - nearest) / 2.
float voronoiGapAlpha(float minDist, float secondMinDist, float cellSize, float gap){
    if (gap <= 0.0) return 1.0;
    float edgePixels = (secondMinDist - minDist) * 0.5 * cellSize;
    return smoothstep(-0.5, 0.5, edgePixels - gap * 0.5);
}

float hash1(vec2 p){
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p){
    return vec2(hash1(p), hash1(p + 17.0));
}

vec2 rotateAround(vec2 p, vec2 center, float angle){
    float c = cos(angle);
    float s = sin(angle);
    vec2 d = p - center;
    return vec2(d.x * c - d.y * s, d.x * s + d.y * c) + center;
}

// Splits the plane into a hex grid. Returns the offset from the nearest hex
// center (gv) and writes that center's grid-space coordinate to id.
vec2 hexCenter(vec2 p, out vec2 id){
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(p, r) - h;
    vec2 b = mod(p - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    id = p - gv;
    return gv;
}

    // Shared tail: sample the source at a rotated-space point (with per-cell light),
    // rotating the sample point back into the original frame first.
vec4 shadeAt(vec2 samplePointRotated, vec2 lightKey, vec2 center, vec2 uResolution){
    vec2 samplePixel = rotateAround(samplePointRotated, center, -uRotation);
    vec2 sampleUV = clamp(samplePixel / uResolution, 0.0, 1.0);
    vec4 color = texture2D(uTexture, sampleUV);
    vec2 n = normalize(hash2(lightKey * 1.37) - 0.5);
    float light = 1.0 + uLightStrength * dot(n, normalize(vec2(0.5, 0.8)));
    return vec4(color.rgb * light, color.a);
}

void main() {
    vec2 uResolution = vec2(uStepW, uStepH);
    vec2 center = uResolution * 0.5;
    vec2 pixel = vTexCoord * uResolution;

    // work in a rotated coordinate frame so the grid can be rotated
    vec2 rPixel = rotateAround(pixel, center, uRotation);

    if (uMode > 2.5) {
        // crystallize: jittered point per cell, color = nearest point's sample (classic Voronoi mosaic)
        vec2 p = rPixel / uCellSize;
        vec2 baseId = floor(p);
        float minDist = 1.0e9;
        float secondMinDist = 1.0e9;
        vec2 closestPoint = vec2(0.0);
        vec2 closestId = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 neighborId = baseId + vec2(float(x), float(y));
                vec2 pointOffset = 0.5 + (hash2(neighborId) - 0.5) * uJitter;
                vec2 point = neighborId + pointOffset;
                float d = distance(p, point);
                if (d < minDist) {
                    secondMinDist = minDist;
                    minDist = d;
                    closestPoint = point;
                    closestId = neighborId;
                } else if (d < secondMinDist) {
                    secondMinDist = d;
                }
            }
        }
        vec4 col = shadeAt(closestPoint * uCellSize, closestId, center, uResolution);
        float gapT = voronoiGapAlpha(minDist, secondMinDist, uCellSize, uGridGap);
        gl_FragColor = mix(vec4(col.rgb * 0.35, col.a), col, gapT);
        return;
    }

    if (uMode > 1.5) {
        // hexagon: flat-shaded hex mosaic
        vec2 p = rPixel / uCellSize;
        vec2 id;
        vec2 gv = hexCenter(p, id);
        vec2 jitterOffset = (hash2(id) - 0.5) * uJitter;
        vec4 col = shadeAt((id + jitterOffset) * uCellSize, id, center, uResolution);
        float gapT = hexGapAlpha(gv, uCellSize, uGridGap);
        gl_FragColor = mix(vec4(col.rgb * 0.35, col.a), col, gapT);
        return;
    }

    if (uMode > 0.5) {
        // pixelate: nearest block-origin sample on the rotated grid, inverse-rotated back to sample the source
        vec2 blockRPixel = floor(rPixel / uCellSize) * uCellSize;
        vec2 blockPixel = rotateAround(blockRPixel, center, -uRotation);
        vec2 blockUV = clamp(blockPixel / uResolution, 0.0, 1.0);
        vec4 col = texture2D(uTexture, blockUV);
        float gapT = rectGapAlpha(rPixel, uCellSize, uGridGap);
        gl_FragColor = mix(vec4(col.rgb * 0.35, col.a), col, gapT);
        return;
    }

    // lowpoly: split each grid cell into two triangles, flat-shade each
    vec2 p = rPixel / uCellSize;
    vec2 id = floor(p);
    vec2 gv = fract(p);

    bool upper = gv.x > gv.y;
    vec2 triKey = id + (upper ? vec2(0.37, 0.11) : vec2(-0.37, -0.11));

    vec2 centroidCell = id + (upper ? vec2(0.6667, 0.3333) : vec2(0.3333, 0.6667));
    vec2 jitterOffset = (hash2(triKey) - 0.5) * uJitter;

    vec4 col = shadeAt((centroidCell + jitterOffset) * uCellSize, triKey, center, uResolution);
    float gapT = triGapAlpha(gv, upper, uCellSize, uGridGap);
    gl_FragColor = mix(vec4(col.rgb * 0.35, col.a), col, gapT);
}
