#ifdef GL_ES
    precision mediump float;
#endif

varying vec2 vUV;

uniform sampler2D textureMaskSampler;
uniform int HorizontalBlurr;
uniform int VerticalBlurr;
uniform float blurRadius; // 新增：动态模糊半径

void main(void) 
{
    // 动态计算纹理像素大小
    vec2 texelSize = vec2(1.0) / vec2(textureSize(textureMaskSampler, 0));
    float weight[7] = float[] (0.25, 0.2, 0.15, 0.1, 0.05, 0.025, 0.0125); // 扩展权重

    vec4 BG = texture2D(textureMaskSampler, vUV);
    vec3 result = BG.rgb * weight[0];

    if (HorizontalBlurr == 1)
    {
        for (int i = 1; i < 7; ++i)
        {
            float offset = float(i) * blurRadius * texelSize.x;
            result += texture2D(textureMaskSampler, vUV + vec2(offset, 0.0)).rgb * weight[i];
            result += texture2D(textureMaskSampler, vUV - vec2(offset, 0.0)).rgb * weight[i];
        }
    }

    if (VerticalBlurr == 1)
    {
        for (int i = 1; i < 7; ++i)
        {
            float offset = float(i) * blurRadius * texelSize.y;
            result += texture2D(textureMaskSampler, vUV + vec2(0.0, offset)).rgb * weight[i];
            result += texture2D(textureMaskSampler, vUV - vec2(0.0, offset)).rgb * weight[i];
        }
    }

    gl_FragColor = vec4(result, 1.0);
}
