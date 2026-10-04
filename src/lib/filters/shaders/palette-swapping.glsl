/* {{DEFINE}} */

// Palettes are expected in normalized [0,1] RGB (same space as texture2D
// output). JS side must upload src/255, tgt/255 - see updatePalette note.
uniform vec3 uSourcePalette[MAX_COLORS];
uniform vec3 uTargetPalette[MAX_COLORS];

void main() {
    vec4 color = texture2D(uTexture, vTexCoord);

    // Unpremultiply before matching/swapping so color comparisons and the
    // output color aren't attenuated by alpha. Guard div-by-zero.
    float a = color.a;
    vec3 rgb = a > 0.0001 ? color.rgb / a : color.rgb;

    float minDist = 1000000.0;
    vec3 bestMatch = uSourcePalette[0];

    for (int i = 0; i < MAX_COLORS; i++) {
        if (i >= uPaletteSize) {
            break;
        }
        vec3 diff = rgb - uSourcePalette[i];
        float d2 = dot(diff, diff);
        if (d2 < minDist) {
            minDist = d2;
            bestMatch = uTargetPalette[i];
        }
    }

    // Re-premultiply to match texture's alpha convention.
    gl_FragColor = vec4(bestMatch * a, a);
}
