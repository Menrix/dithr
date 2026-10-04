/* {{DEFINE}} */

uniform float uBlackY;
uniform float uRange;

// GLSL approximation of standard sRGB to Linear transformation
vec3 srgbToLinear(vec3 srgb) {
    vec3 cutoff = vec3(lessThanEqual(srgb, vec3(0.04045)));
    vec3 higher = pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
    vec3 lower = srgb / vec3(12.92);

    return mix(higher, lower, cutoff);
}

// GLSL approximation of Linear to sRGB transformation
vec3 linearToSrgb(vec3 linear) {
    vec3 cutoff = vec3(lessThanEqual(linear, vec3(0.0031308)));
    vec3 higher = vec3(1.055) * pow(clamp(linear, 0.0, 1.0), vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower = linear * vec3(12.92);

    return mix(higher, lower, cutoff);
}

void main() {
    vec4 texel = texture2D(uTexture, vTexCoord);
    vec3 lrgb = srgbToLinear(texel.rgb);

    // Calculate source relative linear luminance (BT.709)
    float Y = 0.2126729 * lrgb.r + 0.7151522 * lrgb.g + 0.0721750 * lrgb.b;

    // Force compression constraint: Ensure input Y is mathematically clamped [0.0, 1.0]
    float normalizedY = clamp(Y, 0.0, 1.0);
    float compressedY = uBlackY + (normalizedY * uRange);

    // Proportional chromaticity mapping
    vec3 finalLrgb;
    if (Y > 1e-6) {
        finalLrgb = lrgb * (compressedY / Y);
    } else {
        finalLrgb = vec3(uBlackY);
    }

    // Prevent overflow artifacting outside target gamut bounds
    gl_FragColor = vec4(linearToSrgb(finalLrgb), texel.a);
}
