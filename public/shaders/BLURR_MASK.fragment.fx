#ifdef GL_ES
    precision mediump float;
#endif
    
varying vec2 vUV;
    
uniform sampler2D textureMaskSampler;
uniform int HorizontalBlurr;
uniform int VerticalBlurr;
uniform float screenSizeX;
uniform float screenSizeY;

void main(void) 
{             
    float texel_screen_size_x=1.0/screenSizeX;
    float texel_screen_size_y=1.0/screenSizeY;
    float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

 
    vec4 BG = texture2D(textureMaskSampler, vUV);
    
    vec3 result = (BG.rgb) * weight[0];

    if(HorizontalBlurr == 1)
    {
        for(int i = 1; i < 5; ++i)
        {
            result += texture2D(textureMaskSampler, vUV + vec2(texel_screen_size_x * (float(i)), 0.0)).rgb * weight[i];
            result += texture2D(textureMaskSampler, vUV - vec2(texel_screen_size_x * (float(i)), 0.0)).rgb * weight[i];
        }
    }
    if(VerticalBlurr == 1)
    {
        for(int i = 1; i < 5; ++i)
        {
            result += texture2D(textureMaskSampler, vUV + vec2(0.0,texel_screen_size_y * (float(i)))).rgb * weight[i];
            result += texture2D(textureMaskSampler, vUV - vec2(0.0,texel_screen_size_y * (float(i)))).rgb * weight[i];
        }
    }
    gl_FragColor = vec4(result, 1.0);
}

