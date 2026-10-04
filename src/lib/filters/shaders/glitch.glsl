/* {{DEFINE}} */

uniform vec2 uTexSize;
uniform float uSeed;
uniform float uIntensity;
uniform float uSliceCount;
uniform float uNoiseAmount;
uniform vec2 uRedOffset;
uniform vec2 uGreenOffset;
uniform vec2 uBlueOffset;
uniform float uRedOpacity;
uniform float uGreenOpacity;
uniform float uBlueOpacity;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

void main() {
    float band = floor(vTexCoord.y * uSliceCount);
    float bandRand = hash(band + uSeed);
    float active = step(0.6, bandRand);
    float bandDisp = (bandRand - 0.5) * 0.08 * uIntensity * active;

    vec2 base = vec2(vTexCoord.x + bandDisp, vTexCoord.y);
    vec4 src = texture2D(uTexture, base);

    vec2 redUV   = clamp(base + uRedOffset / uTexSize,   0.0, 1.0);
    vec2 greenUV = clamp(base + uGreenOffset / uTexSize, 0.0, 1.0);
    vec2 blueUV  = clamp(base + uBlueOffset / uTexSize,  0.0, 1.0);

    float shiftedR = texture2D(uTexture, redUV).r;
    float shiftedG = texture2D(uTexture, greenUV).g;
    float shiftedB = texture2D(uTexture, blueUV).b;

    float r = mix(src.r, shiftedR, uRedOpacity);
    float g = mix(src.g, shiftedG, uGreenOpacity);
    float b = mix(src.b, shiftedB, uBlueOpacity);

    float n = hash(vTexCoord.y * 1000.0 + uSeed) - 0.5;
    vec3 color = vec3(r, g, b) + n * uNoiseAmount * 0.3;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), src.a);
}
