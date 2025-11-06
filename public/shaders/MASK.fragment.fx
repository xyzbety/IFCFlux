#ifdef GL_ES
    precision mediump float;
#endif

// 剖切面支持
#ifdef CLIPPLANE
uniform vec4 vClipPlane;
#endif

varying vec3 vWorldPosition;

void main(void) 
{
    #ifdef CLIPPLANE
    // 检查当前像素是否在剖切面内
    if (dot(vWorldPosition, vClipPlane.xyz) + vClipPlane.w > 0.0) {
        discard; // 如果不在剖切面内，丢弃像素
    }
    #endif
    
    gl_FragColor = vec4(1.0,1.0,1.0,1.0);
}