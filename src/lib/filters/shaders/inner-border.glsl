/* {{DEFINE}} */

uniform float uWidth;      // border thickness, px
uniform float uRadius;     // corner radius of the inner hole, px
uniform vec2 uTexSize;     // image dims in px
uniform vec4 uColor;

/* {{BLEND_GLSL}} */

// signed distance to a rounded rect centered at origin, half-extents b, corner radius r
float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
    vec4 src = texture2D(uTexture, vTexCoord);
    vec2 px = vTexCoord * uTexSize;

    vec2 halfSize = uTexSize * 0.5 - uWidth;          // half-extents of the inner hole
    float r = clamp(uRadius, 0.0, min(halfSize.x, halfSize.y)); // radius can't exceed the hole itself
    float sdHole = sdRoundRect(px - uTexSize * 0.5, max(halfSize, 0.0), r);

    // sdHole < 0 => inside the hole (no border). 1px antialiased edge at the hole boundary.
    float inBorder = smoothstep(-1.0, 0.0, sdHole);

    vec3 blended = blend(src.rgb, uColor.rgb);
    vec3 outRgb = mix(src.rgb, blended, inBorder * uColor.a);

    gl_FragColor = vec4(outRgb, src.a);
}
