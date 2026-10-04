/* {{DEFINE}} */

uniform vec2 uTexSize;
uniform float uDotSize;
uniform float uStrength;
uniform float uAngleC;
uniform float uAngleM;
uniform float uAngleY;
uniform float uAngleK;

float dotMask(vec2 pos, float angleDeg, float ink, float dotSize, float strength) {
    float a = radians(angleDeg);
    float s = sin(a);
    float c = cos(a);
    vec2 rotated = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);
    float safeDotSize = max(dotSize, 1.0);
    vec2 cell = mod(rotated, safeDotSize) / safeDotSize - vec2(0.5);
    float dist = length(cell);
    float radius = ink * 0.5;
    return 1.0 - smoothstep(radius - strength, radius + strength, dist);
}

void main() {
    vec4 texel = texture2D(uTexture, vTexCoord);
    vec3 rgb = mix(vec3(1.0), texel.rgb, texel.a);

    float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
    float invK = 1.0 - k;
    float cInk = invK > 0.0001 ? (invK - rgb.r) / invK : 0.0;
    float mInk = invK > 0.0001 ? (invK - rgb.g) / invK : 0.0;
    float yInk = invK > 0.0001 ? (invK - rgb.b) / invK : 0.0;

    vec2 pos = vTexCoord * uTexSize;

    float cDot = dotMask(pos, uAngleC, cInk, uDotSize, uStrength);
    float mDot = dotMask(pos, uAngleM, mInk, uDotSize, uStrength);
    float yDot = dotMask(pos, uAngleY, yInk, uDotSize, uStrength);
    float kDot = dotMask(pos, uAngleK, k, uDotSize, uStrength);

    vec3 out_;
    out_.r = 1.0 - min(1.0, cDot + kDot);
    out_.g = 1.0 - min(1.0, mDot + kDot);
    out_.b = 1.0 - min(1.0, yDot + kDot);

    gl_FragColor = vec4(out_, texel.a < 0.001 ? 0.0 : 1.0);
}
