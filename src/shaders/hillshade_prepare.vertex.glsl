uniform mat4 u_matrix;
uniform vec2 u_dimension;

in vec2 a_pos;
in vec2 a_texture_pos;

out vec2 v_pos;

void main() {
    gl_Position = u_matrix * vec4(a_pos, 0, 1);

    // adjust the coords because we have a pixel of padding around the border to be able to estimate the gradients
    // we use u_dimension-1 because we want to match the texel center at (0,0) and (1,1)
    highp vec2 epsilon = 1.0 / (u_dimension - 1.0);
    float scale = (u_dimension.x - 3.0) / (u_dimension.x - 1.0);
    v_pos = (a_texture_pos / 8192.0) * scale + epsilon;
}
