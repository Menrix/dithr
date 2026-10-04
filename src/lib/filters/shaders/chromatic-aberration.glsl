/* {{DEFINE}} */

uniform float uStrength;
uniform float uAngleRad;
uniform float uRadial;

void main() {
    vec2 dir = vec2(cos(uAngleRad), sin(uAngleRad));
    float falloff = 1.0;
    if (uRadial > 0.5) {
        vec2 d = vTexCoord - vec2(0.5, 0.5);
        falloff = length(d) * 2.0;
    }
    vec2 off = dir * uStrength * falloff;

    float r = texture2D(uTexture, vTexCoord + off).r;
    float g = texture2D(uTexture, vTexCoord).g;
    float b = texture2D(uTexture, vTexCoord - off).b;
    float a = texture2D(uTexture, vTexCoord).a;

    gl_FragColor = vec4(r, g, b, a);
}
