uniform sampler2D u_texture;
uniform vec4 u_fog_color;
uniform vec4 u_horizon_color;
uniform float u_fog_ground_blend;
uniform float u_fog_ground_blend_opacity;
uniform float u_horizon_fog_blend;
uniform bool u_is_globe_mode;
uniform bool u_show_contour;
uniform vec4 u_contour_color;

in vec2 v_texture_pos;
in float v_fog_depth;
in float v_height;

const float gamma = 2.2;

vec4 gammaToLinear(vec4 color) {
    return pow(color, vec4(gamma));
}

vec4 linearToGamma(vec4 color) {
    return pow(color, vec4(1.0 / gamma));
}

void main() {
    vec4 surface_color = texture(u_texture, vec2(v_texture_pos.x, 1.0 - v_texture_pos.y));

    if (u_show_contour) {
        float d = abs(mod(v_height, 10.0));
        float d2 = min(d, 10.0-d) / 10.0;
        surface_color = mix(
            u_contour_color,
            surface_color,
            0.75 + 0.25 * smoothstep(0.0, 0.2, d2 / max(length(fwidth(v_height)), 1e-6))
        );
    }

    // Skip fog blending in globe mode
    if (!u_is_globe_mode && v_fog_depth > u_fog_ground_blend) {
        vec4 surface_color_linear = gammaToLinear(surface_color);
        float blend_color = smoothstep(0.0, 1.0, max((v_fog_depth - u_horizon_fog_blend) / (1.0 - u_horizon_fog_blend), 0.0));
        vec4 fog_horizon_color_linear = mix(gammaToLinear(u_fog_color), gammaToLinear(u_horizon_color), blend_color);
        float factor_fog = max(v_fog_depth - u_fog_ground_blend, 0.0) / (1.0 - u_fog_ground_blend);
        fragColor = linearToGamma(mix(surface_color_linear, fog_horizon_color_linear, pow(factor_fog, 2.0) * u_fog_ground_blend_opacity));
    } else {
        fragColor = surface_color;
    }
}
