#ifdef GL_ES
    precision mediump float;
#endif
#define CLIPPLANE

varying vec2 vUV;

uniform sampler2D textureMaskSampler;
uniform sampler2D textureSimpleSampler;

uniform int outline_pixel_width;
uniform vec4 outline_color;
uniform float screenSizeX;
uniform float screenSizeY;

// 剖切面参数（从场景传递）
uniform vec4 vClipPlane;
uniform mat4 viewProjection;

// 计算世界坐标（从深度和UV重建）
vec3 reconstructWorldPosition(vec2 uv, float depth) {
    vec4 clipSpacePosition = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 worldSpacePosition = viewProjection * clipSpacePosition;
    return worldSpacePosition.xyz / worldSpacePosition.w;
}

// 检查点是否在剖切面内
bool isPointInsideClipPlane(vec3 worldPos) {
    return dot(worldPos, vClipPlane.xyz) + vClipPlane.w <= 0.0;
}

// 检查当前像素是否在剖切面内
bool isCurrentPixelInsideClipPlane() {
    // 从前景纹理获取深度信息
    vec4 fgSample = texture2D(textureSimpleSampler, vUV);
    
    // 重建当前像素的世界坐标
    vec3 currentWorldPos = reconstructWorldPosition(vUV, fgSample.a);
    
    // 检查是否在剖切面内
    return isPointInsideClipPlane(currentWorldPos);
}


void main(void)
{
    vec4 BG = texture2D(textureMaskSampler, vUV);
    vec4 FG = texture2D(textureSimpleSampler, vUV);

    float texel_screen_size_x = 1.0 / screenSizeX;
    float texel_screen_size_y = 1.0 / screenSizeY;
    int number_pixels = outline_pixel_width;

    float outline_intensity = 0.0;
    vec2 texel_UV;

    // 计算边框强度（考虑剖切面边界）
    for (int i = 0; i < number_pixels; i++)
    {
        for (int j = 0; j < number_pixels; j++)
        {
            float texel_x = float(i - number_pixels / 2);
            float texel_y = float(j - number_pixels / 2);
            texel_UV.xy = vUV.xy + vec2(texel_x * texel_screen_size_x, texel_y * texel_screen_size_y);
            
            // 获取采样点的遮罩值
            float maskValue = texture2D(textureMaskSampler, texel_UV).r;
            
            // 如果采样点有遮罩（即有几何体）
            if (maskValue > 0.1) {
                #ifdef CLIPPLANE
                // 从前景纹理获取深度信息
                vec4 fgSample = texture2D(textureSimpleSampler, texel_UV);
                
                // 重建世界坐标
                vec3 sampleWorldPos = reconstructWorldPosition(texel_UV, fgSample.a);
                
                // 检查采样点是否在剖切面内
                if (isPointInsideClipPlane(sampleWorldPos)) {
                    outline_intensity += maskValue;
                }
                #else
                outline_intensity += maskValue;
                #endif
            } else {
                // 没有几何体的采样点直接累加
                outline_intensity += maskValue;
            }
        }
    }

    #ifdef CLIPPLANE
    // 检查当前像素是否在剖切面内
    bool currentPixelInside = isCurrentPixelInsideClipPlane();
    
    // 检查周围是否有在剖切面内的像素（用于检测边界）
    bool hasVisibleNeighbors = false;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            
            vec2 neighborUV = vUV + vec2(float(i) * texel_screen_size_x, float(j) * texel_screen_size_y);
            vec4 neighborFG = texture2D(textureSimpleSampler, neighborUV);
            vec3 neighborWorldPos = reconstructWorldPosition(neighborUV, neighborFG.a);
            
            if (isPointInsideClipPlane(neighborWorldPos)) {
                hasVisibleNeighbors = true;
                break;
            }
        }
        if (hasVisibleNeighbors) break;
    }
    
    // 智能边框显示逻辑
    if (!currentPixelInside) {
        // 当前像素不在剖切面内
        if (outline_intensity > 0.0 && hasVisibleNeighbors) {
            // 有边框强度且有可见邻居：显示边框（剖切面边界）
            gl_FragColor = outline_color;
            return;
        } else {
            // 没有边框或没有可见邻居：完全被裁剪，丢弃
            discard;
            return;
        }
    }
    #endif

    // 判断是否显示边框（当前像素在剖切面内）
    if (outline_intensity > 0.0)
    {
        if (BG.r > 0.4) {
            // 模型内部：显示前景色并叠加颜色
            vec4 result = FG; 
            
            // 在模型表面叠加颜色（仅对模型内部区域生效）
            vec4 overrideLayer = outline_color; 
            overrideLayer.a = 0.3; // 半透明红色（透明度30%）
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