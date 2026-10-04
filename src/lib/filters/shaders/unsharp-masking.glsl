/* {{DEFINE}} */

uniform vec2 uTexSize;     // Inverse texture size (1.0 / width, 1.0 / height)
uniform float uAmount;     // Strength of sharpening

void main() {
    // Fetch center pixel first to minimize texture cache stall
    vec4 centerColor = texture2D(uTexture, vTexCoord);

    // Calculate structural step offsets
    vec2 dx = vec2(uTexSize.x, 0.0);
    vec2 dy = vec2(0.0, uTexSize.y);

    // Unroll texture coordinates to leverage the GPU's Vertex/Texture Pipeline cache
    // This avoids dependent texture read penalties in a loop execution path
    vec3 cTL = texture2D(uTexture, vTexCoord - dx + dy).rgb;
    vec3 cTC = texture2D(uTexture, vTexCoord + dy).rgb;
    vec3 cTR = texture2D(uTexture, vTexCoord + dx + dy).rgb;

    vec3 cML = texture2D(uTexture, vTexCoord - dx).rgb;
    vec3 cMR = texture2D(uTexture, vTexCoord + dx).rgb;

    vec3 cBL = texture2D(uTexture, vTexCoord - dx - dy).rgb;
    vec3 cBC = texture2D(uTexture, vTexCoord - dy).rgb;
    vec3 cBR = texture2D(uTexture, vTexCoord + dx - dy).rgb;

    // Approximate a 3x3 Gaussian blur distribution for better edge fidelity than a box blur
    // Weights: Center 4/16, Edges 2/16, Corners 1/16
    vec3 blurred = (cTL + cTR + cBL + cBR) * 0.0625 +
                   (cTC + cML + cMR + cBC) * 0.125 +
                   (centerColor.rgb) * 0.25;

    // High-pass isolation
    vec3 mask = centerColor.rgb - blurred;

    // Calculate sharpened RGB array
    vec3 sharpened = centerColor.rgb + (mask * uAmount);

    // Eliminate dynamic branching: mix dynamically based on uAmount logic
    // If uAmount is 0.0, mix output evaluates to exactly centerColor.rgb
    gl_FragColor = vec4(clamp(sharpened, 0.0, 1.0), centerColor.a);
}
