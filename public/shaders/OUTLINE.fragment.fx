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
    vec4 BG = texture2D(textureMaskSampler, vUV);
    vec4 FG = texture2D(textureSimpleSampler, vUV);

    float texel_screen_size_x = 1.0 / screenSizeX;
    float texel_screen_size_y = 1.0 / screenSizeY;
    int number_pixels = outline_pixel_width;

    // 当前像素是否在模型内部（使用原始遮罩判断）
    bool isInsideModel = BG.r > 0.4;
    
    // 如果不在模型内部，直接显示前景色
    if (!isInsideModel) {
        gl_FragColor = FG;
        return;
    }
    
    // 检查是否是边缘像素
    bool isEdgePixel = false;
    
    // 检查周围像素是否在模型外部
    for (int i = -number_pixels/2; i <= number_pixels/2; i++)
    {
        for (int j = -number_pixels/2; j <= number_pixels/2; j++)
        {
            // 跳过中心点
            if (i == 0 && j == 0) continue;
            
            vec2 sampleUV = vUV + vec2(float(i) * texel_screen_size_x, float(j) * texel_screen_size_y);
            
            // 确保采样坐标在有效范围内
            if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) {
                continue; // 跳过屏幕边缘
            }
            
            // 获取采样点的遮罩值
            float maskValue = texture2D(textureMaskSampler, sampleUV).r;
            
            // 如果周围像素不在模型内部，标记为边缘
            if (maskValue <= 0.4) {
                isEdgePixel = true;
                break;
            }
        }
        if (isEdgePixel) break;
    }

    // 判断是否显示边框
    if (isEdgePixel)
    {
        // 边框区域：显示边框颜色
        gl_FragColor = outline_color; 
    }
    else
    {
        // 模型内部：显示前景色并叠加颜色
        vec4 result = FG; 
        
        // 在模型表面叠加颜色（仅对模型内部区域生效）
        vec4 overrideLayer = outline_color; 
        overrideLayer.a = 0.3; 
        result = mix(result, overrideLayer, overrideLayer.a); // 混合
        result.a = 0.9;
        gl_FragColor = result;
    }
}
