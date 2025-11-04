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
    vec4 result;

    vec4 BG = texture2D(textureMaskSampler, vUV);
    vec4 FG = texture2D(textureSimpleSampler, vUV);

    float texel_screen_size_x=1.0/screenSizeX;
    float texel_screen_size_y=1.0/screenSizeY;
    int number_pixels=outline_pixel_width;

    float outline_intensity = 0.0;
    vec2 texel_UV;

    for(int i=0;i<number_pixels;i++)
    {
        for(int j=0;j<number_pixels;j++)
        {
            float texel_x = float(i-number_pixels/2);
            float texel_y = float(j-number_pixels/2);
                    
            texel_UV.xy = vUV.xy + vec2(texel_x * texel_screen_size_x, texel_y * texel_screen_size_y);
                    
            outline_intensity += texture2D(textureMaskSampler, texel_UV).r;
        }
    }

    if(outline_intensity > 0.0)
    {
        if(BG.r > 0.3)
            result = FG;

        else
            result = outline_color;
    }

    else
        result = FG;

    gl_FragColor = result;
}