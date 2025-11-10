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

    float outline_intensity = 0.0;
    vec2 texel_UV;

    // 计算边框强度
    for (int i = 0; i < number_pixels; i++)
    {
        for (int j = 0; j < number_pixels; j++)
        {
            float texel_x = float(i - number_pixels / 2);
            float texel_y = float(j - number_pixels / 2);
            texel_UV.xy = vUV.xy + vec2(texel_x * texel_screen_size_x, texel_y * texel_screen_size_y);
            
            // 获取采样点的遮罩值
            float maskValue = texture2D(textureMaskSampler, texel_UV).r;
            
            outline_intensity += maskValue;
        }
    }

    // 判断是否显示边框
    if (outline_intensity > 0.0)
    {
        if (BG.r > 0.4) {
            // 模型内部：显示前景色并叠加颜色
            vec4 result = FG; 
            
            // 在模型表面叠加颜色（仅对模型内部区域生效）
            vec4 overrideLayer = outline_color; 
            overrideLayer.a = 0.3; 
            result = mix(result, overrideLayer, overrideLayer.a); // 混合
            result.a = 0.9;
            gl_FragColor = result;
        } else {
            // 边框区域：显示边框颜色
            gl_FragColor = outline_color; 
        }
    }
    else
    {
        // 无边框区域：直接显示前景色
        gl_FragColor = FG; 
    }
}