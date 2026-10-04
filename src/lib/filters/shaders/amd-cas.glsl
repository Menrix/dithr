/* {{DEFINE}} */

uniform float uSharpness;
uniform vec2 uTexSize;
uniform bool uTransparentMode;

void main() {
    vec4 center = texture2D(uTexture, vTexCoord);
    vec4 a = texture2D(uTexture, vTexCoord + vec2(-uTexSize.x, 0.0));
    vec4 b = texture2D(uTexture, vTexCoord + vec2(0.0, -uTexSize.y));
    vec4 c = texture2D(uTexture, vTexCoord + vec2(uTexSize.x, 0.0));
    vec4 d = texture2D(uTexture, vTexCoord + vec2(0.0, uTexSize.y));
    vec3 e = center.rgb;

    const float EPS = 1e-5;

    float wa = uTransparentMode ? a.a : 1.0;
    float wb = uTransparentMode ? b.a : 1.0;
    float wc = uTransparentMode ? c.a : 1.0;
    float wd = uTransparentMode ? d.a : 1.0;

    float minG = e.g;
    float maxG = e.g;
    if (wa > EPS) { minG = min(minG, a.g); maxG = max(maxG, a.g); }
    if (wb > EPS) { minG = min(minG, b.g); maxG = max(maxG, b.g); }
    if (wc > EPS) { minG = min(minG, c.g); maxG = max(maxG, c.g); }
    if (wd > EPS) { minG = min(minG, d.g); maxG = max(maxG, d.g); }

    float amplification = sqrt(clamp(min(minG, 1.0 - maxG) / max(maxG, EPS), 0.0, 1.0));
    float weight = amplification * uSharpness;

    vec3 aC = mix(e, a.rgb, wa);
    vec3 bC = mix(e, b.rgb, wb);
    vec3 cC = mix(e, c.rgb, wc);
    vec3 dC = mix(e, d.rgb, wd);

    float softLimiter = 1.0 / (1.0 + 4.0 * weight);
    vec3 sharpened = (aC + bC + cC + dC) * weight + e;
    vec3 finalColor = clamp(sharpened * softLimiter, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, center.a);
}
