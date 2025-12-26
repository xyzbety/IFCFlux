#ifdef GL_ES
    precision mediump float;
#endif

varying vec2 vUV;

uniform sampler2D textureMaskSampler;
uniform sampler2D textureSimpleSampler;

uniform int outline_pixel_width; 
uniform vec4 outline_color;
uniform float screenSizeX;
uniform float screenSizeY;

void main(void)
{
    // 预计算
    vec2 texel = vec2(1.0 / screenSizeX, 1.0 / screenSizeY);
    float threshold = 0.4;

    // 先只读取 mask 中心（避免不必要的 FG 采样）
    float centerMask = texture2D(textureMaskSampler, vUV).r;

    // 如果不在模型内部，直接输出前景（延后取 FG 也仅取一次）
    if (centerMask <= threshold) {
        gl_FragColor = texture2D(textureSimpleSampler, vUV);
        return;
    }

    // 8 邻域采样偏移（单圈）
    vec2 offsets[8];
    offsets[0] = vec2( texel.x,  0.0); // E
    offsets[1] = vec2(-texel.x,  0.0); // W
    offsets[2] = vec2( 0.0,  texel.y); // N
    offsets[3] = vec2( 0.0, -texel.y); // S
    offsets[4] = vec2( texel.x,  texel.y); // NE
    offsets[5] = vec2(-texel.x,  texel.y); // NW
    offsets[6] = vec2( texel.x, -texel.y); // SE
    offsets[7] = vec2(-texel.x, -texel.y); // SW

    // 限制最大半径，避免动态大循环（编译期稳定）
    const int MAX_RADIUS = 8; // 可根据硬件调小或调大（性能 vs 质量）
    int maxR = outline_pixel_width;
    if (maxR > MAX_RADIUS) maxR = MAX_RADIUS;
    bool isEdge = false;

    // 检查 1..maxR 环上的采样（每圈 8 个采样点）
    for (int r = 1; r <= MAX_RADIUS; ++r) {
        if (r > maxR) break;
        // 缩放偏移量
        float scale = float(r);
        for (int i = 0; i < 8; ++i) {
            vec2 sampleUV = clamp(vUV + offsets[i] * scale, 0.0, 1.0);
            float m = texture2D(textureMaskSampler, sampleUV).r;
            if (m <= threshold) {
                isEdge = true;
                break;
            }
        }
        if (isEdge) break;
    }

    // 现在再采样 FG（只一次）
    vec4 FG = texture2D(textureSimpleSampler, vUV);

    if (isEdge) {
        // 边缘区域显示边框颜色
        gl_FragColor = outline_color;
    } else {
        // 内部区域：在 FG 上叠加半透明覆盖色
        vec4 overrideLayer = outline_color;
        overrideLayer.a = 0.3;
        vec4 result = mix(FG, overrideLayer, overrideLayer.a);
        result.a = 0.9;
        gl_FragColor = result;
    }
}