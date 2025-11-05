#ifdef GL_ES
    precision mediump float;
#endif

varying vec2 vUV;
varying vec3 vPosition;

uniform sampler2D textureMaskSampler;
uniform sampler2D textureSimpleSampler;

uniform int outline_pixel_width;
uniform vec4 outline_color;
uniform float screenSizeX;
uniform float screenSizeY;
uniform vec4 clipPlane;
uniform sampler2D depthTexture;
uniform mat4 invViewProjectionMatrix; // 相机视图投影矩阵的逆矩阵

void main(void) 
{
    vec4 result;
    // 从深度纹理获取深度值
    float depth = texture(depthTexture, vUV).r;

    // 将屏幕坐标转换为世界坐标
    vec4 clipSpacePos = vec4(vUV * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 worldSpacePos = invViewProjectionMatrix * clipSpacePos;
    worldSpacePos /= worldSpacePos.w;

    // 计算当前像素是否在裁剪平面之外
    if (dot(clipPlane.xyz, worldSpacePos.xyz) + clipPlane.w < 0.0) {
        discard;
    }

    vec4 BG = texture2D(textureMaskSampler, vUV);
    vec4 FG = texture2D(textureSimpleSampler, vUV);

    float texel_screen_size_x = 1.0 / screenSizeX;
    float texel_screen_size_y = 1.0 / screenSizeY;
    int number_pixels = outline_pixel_width;

    float outline_intensity = 0.0;
    vec2 texel_UV;

    // 计算边框强度
    for(int i = 0; i < number_pixels; i++) {
        for(int j = 0; j < number_pixels; j++) {
            float texel_x = float(i - number_pixels / 2);
            float texel_y = float(j - number_pixels / 2);
            texel_UV.xy = vUV.xy + vec2(texel_x * texel_screen_size_x, texel_y * texel_screen_size_y);
            outline_intensity += texture2D(textureMaskSampler, texel_UV).r;
        }
    }

    // 判断是否显示边框
    if(outline_intensity > 0.0) {
        if(BG.r > 0.4)
            result = FG; // 模型内部
        else
            result = outline_color; // 边框
    } else {
        result = FG; // 无边框区域
    }

    // 在模型表面叠加颜色仅对模型内部区域生效）
    if (BG.r > 0.4) {
        vec4 overrideLayer = outline_color; // 半透明红色（透明度30%）
        overrideLayer.a = 0.3;
        result = mix(result, overrideLayer, overrideLayer.a); // 混合
        result.a = 0.9;
    }

    gl_FragColor = result;
}
