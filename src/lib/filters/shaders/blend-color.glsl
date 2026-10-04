/* {{DEFINE}} */

uniform vec4 uColor;

/* {{BLEND_GLSL}} */

void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    gl_FragColor = color;

    if (color.a > 0.0) {
        gl_FragColor = vec4(blend(color.rgb, uColor.rgb), color.a);
    }
}
