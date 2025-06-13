uniform sampler2D u_texture;
uniform vec4 u_fog_color;
uniform vec4 u_horizon_color;
uniform float u_fog_ground_blend;
uniform float u_fog_ground_blend_opacity;
uniform float u_horizon_fog_blend;
uniform bool u_is_globe_mode;
uniform bool u_show_contour;
uniform float u_contour_minor_opacity;
uniform float u_contour_major_opacity;
uniform vec4 u_contour_major_color;
uniform vec4 u_contour_minor_color;
uniform float u_contour_major_linewidth;
uniform float u_contour_minor_linewidth;
uniform float u_contour_minor_spacing;
uniform float u_contour_major_spacing;

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

vec4 applyContour(vec4 surface_color) {
    float fw = max(length(fwidth(v_height)), 1e-6);
    if (u_contour_major_spacing > 0.) {
        // major
        float d3 = abs(mod(v_height, u_contour_major_spacing));
        float d4 = min(d3, u_contour_major_spacing-d3) / fw;
        if (d4 < u_contour_major_linewidth) {
            return mix(
                u_contour_major_color,
                surface_color,
                1.0-u_contour_major_opacity + u_contour_major_opacity * smoothstep(0.0, u_contour_major_linewidth, d4)
            );
        }
    }
    if (u_contour_minor_spacing > 0.) {
        // minor
        float d1 = abs(mod(v_height, u_contour_minor_spacing));
        float d2 = min(d1, u_contour_minor_spacing-d1) / fw;
        if (d2 < u_contour_minor_linewidth) {
            return mix(
                u_contour_minor_color,
                surface_color,
                1.0-u_contour_minor_opacity + u_contour_minor_opacity * smoothstep(0.0, u_contour_minor_linewidth, d2)
            );
        }
    }
    return surface_color;
}

void main() {
    vec4 surface_color = texture(u_texture, vec2(v_texture_pos.x, 1.0 - v_texture_pos.y));

    if (u_show_contour) surface_color = applyContour(surface_color);

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
