uniform mat4 u_matrix;
uniform sampler2D u_image;

in vec2 a_pos;

out vec2 v_pos;

void main() {
    gl_Position = projectTile(a_pos, a_pos);
    // adjust the coords because we have a pixel of padding around the border so that the linear interpolation has data to work with
    vec2 epsilon = 1.0 / vec2(textureSize(u_image,0));
    float scale = 1.0 - 2.0 * epsilon.x;
    v_pos = a_pos / 8192.0 * scale + epsilon;
    // North pole
    if (a_pos.y < -32767.5) {
        v_pos.y = 0.0;
    }
    // South pole
    if (a_pos.y > 32766.5) {
        v_pos.y = 1.0;
    }
}
