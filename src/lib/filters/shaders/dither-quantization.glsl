/* {{DEFINE}} */

/* {{SHADER_UTILS}} */

void main() {
    vec4 texel = texture2D(uTexture, vTexCoord);
    vec3 color = texel.rgb;

    #ifdef USE_LAB
        vec3 pixelLab = srgbToLab(color);
        vec3 closest = findClosest(pixelLab);
    #elif defined(USE_OKLAB)
        vec3 pixelLab = srgbToOklab(color);
        vec3 closest = findClosest(pixelLab);
    #else
        vec3 closest = findClosest(color);
    #endif

    gl_FragColor = vec4(closest, texel.a);
}
