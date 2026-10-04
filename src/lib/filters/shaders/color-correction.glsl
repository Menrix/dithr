/* {{DEFINE}} */

uniform float uBrightness;
uniform float uContrast;
uniform vec3 uGamma;
uniform float uHueCos;
uniform float uHueSin;
uniform float uVibrance;
uniform float uSaturation;
uniform float uShadowBoost;
uniform float uMidBoost;
uniform float uHighlightCompress;
uniform float uToneMidpoint;
uniform float uToneStrength;
uniform float uInvert;

void main() {
    vec4 color = texture2D(uTexture, vTexCoord);

    // Grayscale
    #ifdef GRAYSCALE_AVERAGE
        color.rgb = vec3((color.r + color.g + color.b) / 3.0);
    #elif defined(GRAYSCALE_LIGHTNESS)
        color.rgb = vec3((max(max(color.r, color.g), color.b) + min(min(color.r, color.g), color.b)) / 2.0);
    #elif defined(GRAYSCALE_LUMINOSITY)
        color.rgb = vec3(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)));
    #endif

    // Brightness
    color.rgb += uBrightness;

    // Contrast
    color.rgb = uContrast * (color.rgb - 0.5) + 0.5;

    // Clamp before gamma - pow() with negative base and fractional
    // exponent is undefined in GLSL ES 1.0, produces NaN.
    color.rgb = clamp(color.rgb, 0.0, 1.0);

    // Gamma
    vec3 correction = 1.0 / uGamma;
    color.r = pow(color.r, correction.r);
    color.g = pow(color.g, correction.g);
    color.b = pow(color.b, correction.b);

    // Hue rotation (W3C hue-rotate matrix, luma-preserving).
    {
        float c = uHueCos;
        float s = uHueSin;
        mat3 hueMat = mat3(
            0.213 + c*0.787 - s*0.213,  0.213 - c*0.213 + s*0.143,  0.213 - c*0.213 - s*0.787,
            0.715 - c*0.715 - s*0.715,  0.715 + c*0.285 + s*0.140,  0.715 - c*0.715 + s*0.715,
            0.072 - c*0.072 + s*0.928,  0.072 - c*0.072 - s*0.283,  0.072 + c*0.928 + s*0.072
        );
        color.rgb = clamp(hueMat * color.rgb, 0.0, 1.0);
    }

    // Vibrance + Saturation, combined
    float channelMax = max(color.r, max(color.g, color.b));
    vec3 diff = vec3(channelMax) - color.rgb;

    float avg = (color.r + color.g + color.b) / 3.0;
    float vibAmt = abs(channelMax - avg) * 2.0 * uVibrance;

    float k = vibAmt + (1.0 - vibAmt) * uSaturation;
    color.rgb += diff * k;

    color.rgb = clamp(color.rgb, 0.0, 1.0);

    // Tone curve (shadow/mid/highlight) - same three-weight-mask
    // formulation as the CPU LUT, evaluated directly since there's
    // no dynamic array indexing in GLSL ES 1.0 to build a texture LUT from.
    vec3 m = vec3(uToneMidpoint);
    vec3 wShadow = 1.0 - smoothstep(vec3(0.0), m, color.rgb);
    vec3 wHighlight = smoothstep(m, vec3(1.0), color.rgb);
    vec3 wMid = clamp(1.0 - wShadow - wHighlight, 0.0, 1.0);

    vec3 delta = uShadowBoost * wShadow
               + uMidBoost * wMid
               - uHighlightCompress * wHighlight;

    vec3 mapped = clamp(color.rgb + delta, 0.0, 1.0);
    color.rgb = mix(color.rgb, mapped, uToneStrength);

    // Invert
    if (uInvert > 0.5) {
        color.rgb = 1.0 - color.rgb;
    }

    gl_FragColor = color;
}
