// Helper to simulate integer modulus: x % y
int intMod(int x, int y) {
    int m = x - (y * (x / y));
    return m < 0 ? m + y : m;
}

vec3 srgbToLinearRgb(vec3 srgb) {
    vec3 lo = srgb / 12.92;
    vec3 hi = pow(max((srgb + 0.055) / 1.055, 0.0), vec3(2.4));
    return mix(lo, hi, step(0.04045, srgb));
}

vec3 linearRgbToSrgb(vec3 linear) {
    linear = clamp(linear, 0.0, 1.0);
    vec3 lo = linear * 12.92;
    vec3 hi = 1.055 * pow(max(linear, 0.0), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(0.0031308, linear));
}

// GLSL pow() is undefined for negative base. Math.cbrt in the TS reference
// handles negative l_/m_/s_ fine; GLSL needs an explicit sign-preserving cbrt
// or Oklab produces NaN on any channel where L/M/S ends up negative
// (happens near gamut edges / out-of-range colors).
float safeCbrt(float x) {
    return sign(x) * pow(abs(x), 1.0 / 3.0);
}

const vec3 LUMA709 = vec3(0.2126, 0.7152, 0.0722);

#ifdef USE_LAB
vec3 srgbToLab(vec3 srgb) {
    vec3 linearRGB = srgbToLinearRgb(srgb);

    vec3 xyz;
    xyz.x = dot(linearRGB, vec3(0.4124564, 0.3575761, 0.1804375));
    xyz.y = dot(linearRGB, LUMA709);
    xyz.z = dot(linearRGB, vec3(0.0193339, 0.1191920, 0.9503041));

    vec3 v = xyz / vec3(0.95047, 1.00000, 1.08883);

    float e = 216.0 / 24389.0;
    float kappa116 = 841.0 / 108.0; // = CIE kappa (903.3) / 116, not kappa itself

    vec3 f;
    f.x = (v.x > e) ? pow(max(v.x, 0.00001), 1.0 / 3.0) : (kappa116 * v.x) + (16.0 / 116.0);
    f.y = (v.y > e) ? pow(max(v.y, 0.00001), 1.0 / 3.0) : (kappa116 * v.y) + (16.0 / 116.0);
    f.z = (v.z > e) ? pow(max(v.z, 0.00001), 1.0 / 3.0) : (kappa116 * v.z) + (16.0 / 116.0);

    vec3 lab;
    lab.x = (116.0 * f.y) - 16.0;
    lab.y = 500.0 * (f.x - f.y);
    lab.z = 200.0 * (f.y - f.z);

    return lab;
}
#endif

#ifdef USE_OKLAB
vec3 srgbToOklab(vec3 srgb) {
    vec3 linearRGB = srgbToLinearRgb(srgb);

    float l = dot(linearRGB, vec3(0.4122214708, 0.5363325363, 0.0514459929));
    float m = dot(linearRGB, vec3(0.2119034982, 0.6806995451, 0.1073969566));
    float s = dot(linearRGB, vec3(0.0883024619, 0.2817188376, 0.6299787005));

    float l_ = safeCbrt(l);
    float m_ = safeCbrt(m);
    float s_ = safeCbrt(s);

    return vec3(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}
#endif

vec3 findClosest(vec3 targetSpace) {
    vec3 closestRgb = uPalette[0];
    float minDist = 1000000.0;

    for (int i = 0; i < MAX_COLORS; i++) {
        if (i >= uPaletteSize) break;

        // Ignore palette
        if (uPaletteMap[i] == -1) continue;

        vec3 pSpace = uColorSpacePalette[i];

        vec3 diff = targetSpace - pSpace;
        float d2 = dot(diff, diff);
        if (d2 < minDist) {
            minDist = d2;
            closestRgb = uPalette[i];
        }
    }

    return closestRgb;
}
