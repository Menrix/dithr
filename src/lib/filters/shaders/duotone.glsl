/* {{DEFINE}} */

uniform vec3 uColorDark;
uniform vec3 uColorLight;

const vec3 LUMA709 = vec3(0.2126, 0.7152, 0.0722);

void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float gray = dot(color.rgb, LUMA709);
    vec3 duo = mix(uColorDark, uColorLight, gray);
    gl_FragColor = vec4(duo, color.a);
}
