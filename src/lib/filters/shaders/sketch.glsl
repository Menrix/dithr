/* {{DEFINE}} */

uniform vec2 uTexSize;
uniform float uThreshold;
uniform float uIntensity;
uniform float uThickness;
uniform float uOverlayEnabled;
uniform float uOverlayOpacity;

const vec3 LUMA709 = vec3(0.2126, 0.7152, 0.0722);

// Fixed 1px-kernel Sobel, returns ink amount (0 = no edge, 1 = full edge) at `pos`.
// Kernel width is intentionally NOT scaled by uThickness: scaling the kernel width
// caused an abrupt jump once the offset crossed the source artwork's native stroke
// width (most strokes share similar width, so most edges flipped character at once).
// Thickness is applied separately below as a dilation search radius instead.
float detectInk(vec2 pos) {
    vec2 t = uTexSize;
    float tl = dot(texture2D(uTexture, pos + vec2(-t.x, -t.y)).rgb, LUMA709);
    float t_ = dot(texture2D(uTexture, pos + vec2(0.0, -t.y)).rgb, LUMA709);
    float tr = dot(texture2D(uTexture, pos + vec2(t.x, -t.y)).rgb, LUMA709);
    float l  = dot(texture2D(uTexture, pos + vec2(-t.x, 0.0)).rgb, LUMA709);
    float r  = dot(texture2D(uTexture, pos + vec2(t.x, 0.0)).rgb, LUMA709);
    float bl = dot(texture2D(uTexture, pos + vec2(-t.x, t.y)).rgb, LUMA709);
    float b_ = dot(texture2D(uTexture, pos + vec2(0.0, t.y)).rgb, LUMA709);
    float br = dot(texture2D(uTexture, pos + vec2(t.x, t.y)).rgb, LUMA709);

    float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
    float gy = -tl - 2.0*t_ - tr + bl + 2.0*b_ + br;
    float edge = sqrt(gx*gx + gy*gy);

    return smoothstep(uThreshold, uThreshold + 0.1, edge);
}

void main() {
    vec2 s = uTexSize * uThickness;

    // max-search dilation: 8 fixed compass directions, unrolled (no dynamic loops,
    // no arrays -- GLSL ES 1.00 / WebGL1 constraint). Approximate, not true
    // morphological dilation, but continuous in uThickness with no discontinuity.
    float inkAmount = detectInk(vTexCoord);
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(s.x, 0.0)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(-s.x, 0.0)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(0.0, s.y)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(0.0, -s.y)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(s.x * 0.7071, s.y * 0.7071)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(-s.x * 0.7071, s.y * 0.7071)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(s.x * 0.7071, -s.y * 0.7071)));
    inkAmount = max(inkAmount, detectInk(vTexCoord + vec2(-s.x * 0.7071, -s.y * 0.7071)));

    float grayMultiplier = 1.0 - inkAmount * uIntensity; // 1 = untouched, toward 0 = ink
    vec3 sketchGray = vec3(grayMultiplier);

    vec3 originalColor = texture2D(uTexture, vTexCoord).rgb;
    vec3 overlayResult = originalColor * mix(vec3(1.0), sketchGray, uOverlayOpacity);
    vec3 result = mix(sketchGray, overlayResult, uOverlayEnabled);

    gl_FragColor = vec4(result, texture2D(uTexture, vTexCoord).a);
}
