/* {{DEFINE}} */

uniform float uStepW;
uniform float uStepH;
uniform float uSigmaColor;

vec3 sampleAt(float dx, float dy) {
    return texture2D(uTexture, vTexCoord + vec2(dx * uStepW, dy * uStepH)).rgb;
}

// 3x3 bilateral, single pass. Spatial weights are a fixed approx-Gaussian
// (center 1.0, orthogonal 0.75, diagonal 0.5); range weight comes from
// uSigmaColor. Manually unrolled instead of a loop-indexed array - GLSL ES 1.0
// disallows dynamic array indexing, and this avoids relying on compiler
// unrolling to sidestep it.
void main() {
    vec4 center = texture2D(uTexture, vTexCoord);
    vec3 c = center.rgb;
    float sigma2 = 2.0 * uSigmaColor * uSigmaColor;

    vec3 sum = vec3(0.0);
    float sumW = 0.0;
    vec3 n; float d2; float w;

    n = sampleAt(-1.0, -1.0); d2 = dot(n - c, n - c); w = 0.5  * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt( 0.0, -1.0); d2 = dot(n - c, n - c); w = 0.75 * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt( 1.0, -1.0); d2 = dot(n - c, n - c); w = 0.5  * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt(-1.0,  0.0); d2 = dot(n - c, n - c); w = 0.75 * exp(-d2 / sigma2); sum += n * w; sumW += w;
    sum += c * 1.0; sumW += 1.0; // center, distance 0, range weight always 1
    n = sampleAt( 1.0,  0.0); d2 = dot(n - c, n - c); w = 0.75 * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt(-1.0,  1.0); d2 = dot(n - c, n - c); w = 0.5  * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt( 0.0,  1.0); d2 = dot(n - c, n - c); w = 0.75 * exp(-d2 / sigma2); sum += n * w; sumW += w;
    n = sampleAt( 1.0,  1.0); d2 = dot(n - c, n - c); w = 0.5  * exp(-d2 / sigma2); sum += n * w; sumW += w;

    gl_FragColor = vec4(sum / max(sumW, 0.0001), center.a);
}
