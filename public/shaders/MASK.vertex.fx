#ifdef GL_ES
    precision highp float;
#endif
    
// Attributes
    attribute vec3 position;
    
// Uniforms
    uniform mat4 worldViewProjection;
    uniform mat4 world;

// Varyings
#ifdef CLIPPLANE
varying vec3 vWorldPosition;
#endif
    
void main(void) 
{
    gl_Position = worldViewProjection * vec4(position, 1.0);
    
    #ifdef CLIPPLANE
    // 计算世界坐标
    vWorldPosition = (world * vec4(position, 1.0)).xyz;
    #endif
}