<template>
    <div class="widget-ui"
        style="width: 100%; height: 100%; position: absolute; top: 0px; left: 0px; z-index: 0; pointer-events: none; overflow: hidden; box-sizing: border-box;">
        <div id="cube-view"
            style="pointer-events: auto; display: flex; position: absolute; top: 0px; right: 20px; flex-flow: column; align-items: center;">
            <div class="m-cube"
                style="width: 120px; height: 120px; display: flex; justify-content: center; align-items: center;">
                <div class="loader">
                    <div ref="cubeBody" class="cube" :style="cubeStyle">
                        <!-- 动态渲染立方体的6个面 -->
                        <div 
                            v-for="(direction, index) in directions" 
                            :key="direction.value"
                            class="face" 
                            :style="getFaceTransform(index)"
                        >
                            <div class="face-show" @click="onSelect(direction)">
                                <div>{{ direction.label }}</div>
                            </div>
                            
                            <!-- 渲染角点 -->
                            <div v-if="direction.corners && direction.corners.length" class="face-corners">
                                <div 
                                    v-for="(corner, cornerIndex) in direction.corners"
                                    :key="corner.value"
                                    class="face-corner"
                                    :class="`corner-${cornerIndex + 1}`"
                                    :aria-hover="hoverValue === corner.value"
                                    @click="onSelect(corner)"
                                    @mouseover="onMouseover(corner)"
                                    @mouseout="onMouseout(corner)"
                                >
                                    <div></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 指南针圆环 -->
                        <div class="circle" style="transform: rotateX(90deg) translateZ(-0px) translateX(0px)">
                            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                                width="100%" height="100%" viewBox="0 0 160 160" fill="none">
                                <path fill="var(--cube-bg-color-opacity-container)"
                                    stroke="var(--cube-text-color-placeholder)" stroke-width="0.5"
                                    d="M159.5 80C159.5 36.0934 123.907 0.5 80 0.5C36.0934 0.5 0.5 36.0934 0.5 80C0.5 123.907 36.0934 159.5 80 159.5C123.907 159.5 159.5 123.907 159.5 80ZM30.5 80C30.5 52.6619 52.6619 30.5 80 30.5C107.338 30.5 129.5 52.6619 129.5 80C129.5 107.338 107.338 129.5 80 129.5C52.6619 129.5 30.5 107.338 30.5 80Z"
                                    fill-rule="evenodd">
                                </path>
                                <path fill="var(--cube-text-color-primary)"
                                    d="M73.088 22.208L72.544 21.024C73.712 20.624 75.424 19.952 77.152 19.296L77.152 14.8L73.024 14.8L73.024 13.6L77.152 13.6L77.152 9.82401L78.368 9.82401L78.368 24.112L77.152 24.112L77.152 20.496C75.712 21.12 74.256 21.728 73.088 22.208ZM82.288 15.168C83.776 14.272 85.28 13.2 86.256 12.288L87.152 13.344C85.808 14.384 83.984 15.472 82.288 16.416L82.288 21.712C82.288 22.56 82.416 22.72 83.12 22.72L85.472 22.72C86.224 22.72 86.336 22.016 86.448 19.36C86.752 19.616 87.248 19.856 87.584 19.936C87.456 22.848 87.136 23.888 85.568 23.888L82.992 23.888C81.488 23.888 81.04 23.408 81.04 21.696L81.04 9.84L82.288 9.84L82.288 15.168ZM138.232 76.384L138.232 75.248L142.712 75.248C143.08 74.528 143.432 73.776 143.72 73.024L145 73.552C144.744 74.112 144.472 74.688 144.184 75.248L151.672 75.248L151.672 76.384L143.576 76.384C142.856 77.68 142.072 78.912 141.304 79.952L145.112 79.952L145.112 77.6L146.328 77.6L146.328 79.952L150.984 79.952L150.984 81.12L146.328 81.12L146.328 86.192C146.328 86.896 146.168 87.264 145.672 87.472C145.176 87.68 144.36 87.712 143.224 87.712C143.144 87.344 142.936 86.8 142.76 86.464C143.688 86.48 144.536 86.48 144.808 86.464C145.064 86.464 145.112 86.4 145.112 86.176L145.112 81.12L141.576 81.12C140.616 81.12 140.008 81.2 139.832 81.344C139.768 81.072 139.56 80.448 139.4 80.112C139.768 80.016 140.12 79.552 140.6 78.848C140.888 78.48 141.48 77.552 142.12 76.384L138.232 76.384ZM8.444 75.744L8.444 74.576L22.524 74.576L22.524 75.744L17.756 75.744L17.756 78.064L21.804 78.064L21.804 88.144L20.604 88.144L20.604 87.2L10.476 87.2L10.476 88.192L9.308 88.192L9.308 78.064L13.196 78.064L13.196 75.744L8.444 75.744ZM14.284 75.744L14.284 78.064L16.588 78.064L16.588 75.744L14.284 75.744ZM10.476 83.072L10.476 86.08L20.604 86.08L20.604 83.328L18.22 83.328C16.908 83.328 16.588 82.992 16.588 81.696L16.588 79.168L14.268 79.168C14.188 80.88 13.58 82.736 11.18 83.936C11.052 83.696 10.684 83.248 10.476 83.072ZM10.476 79.168L10.476 83.04C12.604 82.016 13.1 80.576 13.18 79.168L10.476 79.168ZM20.604 79.168L17.756 79.168L17.756 81.696C17.756 82.128 17.804 82.192 18.364 82.192L20.284 82.192C20.476 82.192 20.572 82.192 20.604 82.16L20.604 79.168ZM150.968 86.976C150.328 85.872 148.888 84.112 147.656 82.864L148.648 82.368C149.896 83.584 151.368 85.264 152.04 86.384L150.968 86.976ZM138.136 86.4C139.336 85.408 140.456 83.904 141.112 82.384L142.312 82.704C141.544 84.4 140.312 86.08 139.16 87.168C138.936 86.96 138.44 86.576 138.136 86.4ZM78.828 140.136L78.828 138.536L80.156 138.536L80.156 140.136L86.556 140.136L86.556 141.272L80.156 141.272L80.156 142.968L85.708 142.968L85.708 151.848C85.708 152.568 85.548 152.888 85.02 153.064C84.492 153.256 83.58 153.256 82.268 153.256C82.204 152.936 82.028 152.488 81.852 152.184C82.86 152.232 83.852 152.216 84.124 152.2C84.412 152.184 84.492 152.104 84.492 151.848L84.492 144.072L74.54 144.072L74.54 153.24L73.324 153.24L73.324 142.968L78.828 142.968L78.828 141.272L72.46 141.272L72.46 140.136L78.828 140.136ZM80.348 146.568C80.716 145.912 81.212 144.936 81.452 144.28L82.492 144.6C82.14 145.288 81.756 145.992 81.388 146.568L83.34 146.568L83.34 147.544L80.028 147.544L80.028 149.16L83.628 149.16L83.628 150.168L80.028 150.168L80.028 152.952L78.876 152.952L78.876 150.168L75.42 150.168L75.42 149.16L78.876 149.16L78.876 147.544L75.756 147.544L75.756 146.568L80.348 146.568ZM77.532 146.552C77.388 146.008 76.972 145.208 76.572 144.616L77.516 144.312C77.948 144.872 78.364 145.672 78.54 146.2L77.532 146.552Z"
                                    fill-rule="evenodd">
                                </path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted} from 'vue'
import '../../styles/components/cube.less'

// 定义接口
interface CubeItem {
  label?: string
  value: string
  heading: number
  tilt: number
  corners?: CubeItem[]
}


// 响应式数据
const rotateX = ref(-30)
const rotateY = ref(30)
const hoverValue = ref<string | null>(null)
const cubeBody = ref<HTMLElement>()

// 角点定义
const corners = {
  'front-left-top': {
    heading: 45,
    tilt: 45,
    value: 'front-left-top'
  },
  'front-left-bottom': {
    heading: 45,
    tilt: 135,
    value: 'front-left-bottom'
  },
  'front-right-top': {
    heading: 315,
    tilt: 45,
    value: 'front-right-top'
  },
  'front-right-bottom': {
    heading: 315,
    tilt: 135,
    value: 'front-right-bottom'
  },
  'back-left-top': {
    heading: 135,
    tilt: 45,
    value: 'back-left-top'
  },
  'back-left-bottom': {
    heading: 135,
    tilt: 135,
    value: 'back-left-bottom'
  },
  'back-right-top': {
    heading: 225,
    tilt: 45,
    value: 'back-right-top'
  },
  'back-right-bottom': {
    heading: 225,
    tilt: 135,
    value: 'back-right-bottom'
  },
}

// 方向定义
const directions = [
  {
    value: 'front',
    heading: 0,
    tilt: 90,
    label: '前',
    corners: [
      corners['front-left-top'],
      corners['front-right-top'],
      corners['front-right-bottom'],
      corners['front-left-bottom']
    ]
  },
  {
    value: 'top',
    heading: 0,
    tilt: 0,
    label: '上',
    corners: [
      corners['back-left-top'],
      corners['back-right-top'],
      corners['front-right-top'],
      corners['front-left-top']
    ]
  },
  {
    value: 'bottom',
    heading: 0,
    tilt: 180,
    label: '下',
    corners: [
      corners['front-left-bottom'],
      corners['front-right-bottom'],
      corners['back-right-bottom'],
      corners['back-left-bottom']
    ]
  },
  {
    value: 'back',
    heading: 180,
    tilt: 90,
    label: '后',
    corners: [
      corners['back-right-top'],
      corners['back-left-top'],
      corners['back-left-bottom'],
      corners['back-right-bottom']
    ]
  },
  {
    value: 'left',
    heading: 90,
    tilt: 90,
    label: '左',
    corners: [
      corners['back-left-top'],
      corners['front-left-top'],
      corners['front-left-bottom'],
      corners['back-left-bottom']
    ]
  },
  {
    value: 'right',
    heading: 270,
    tilt: 90,
    label: '右',
    corners: [
      corners['front-right-top'],
      corners['back-right-top'],
      corners['back-right-bottom'],
      corners['front-right-bottom']
    ]
  }
]

// 面的transform映射
const faceTransforms = [
  'translateZ(20px)',                    // front
  'rotateX(90deg) translateZ(20px)',     // top
  'rotateX(-90deg) translateZ(20px)',    // bottom
  'rotateY(180deg) translateZ(20px)',    // back
  'rotateY(-90deg) translateZ(20px)',    // left
  'rotateY(90deg) translateZ(20px)'      // right
]

// 计算立方体样式
const cubeStyle = computed(() => ({
  transform: `rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`
}))

// 获取面的变换
const getFaceTransform = (index: number) => {
  return {
    transform: faceTransforms[index]
  }
}


// 选择处理
const onSelect = (item: CubeItem) => {
  console.log('onSelect', item)
  
  // 更新立方体旋转
  const targetRotateX = item.tilt - 90;
  let targetRotateY = item.heading;

   // 标准化角度，确保在-180到180之间，避免不必要的大角度旋转
  while (targetRotateY - rotateY.value > 180) targetRotateY -= 360;
  while (targetRotateY - rotateY.value < -180) targetRotateY += 360;
  
  rotateX.value = targetRotateX;
  rotateY.value = targetRotateY;
  
  const cubeElement = document.querySelector('.cube')
  if (cubeElement) {
    const customEvent = new CustomEvent('select', {
      detail: { item },
      bubbles: true
    })
    cubeElement.dispatchEvent(customEvent)
  }
}

// 鼠标悬停处理
const onMouseover = (item: CubeItem) => {
  hoverValue.value = item.value
}

// 鼠标离开处理
const onMouseout = (item: CubeItem) => {
  hoverValue.value = null
}

const handleCameraRotationChange = (e: any) => {
  const { rotateX: newRotateX, rotateY: newRotateY } = e.detail;
  
  // 计算平滑过渡的角度
  let smoothRotateY = newRotateY;
  let smoothRotateX = newRotateX;

  // 处理Y轴旋转，避免不必要的大角度旋转
  while (smoothRotateY - rotateY.value > 180) smoothRotateY -= 360;
  while (smoothRotateY - rotateY.value < -180) smoothRotateY += 360;

  // 处理X轴旋转，避免不必要的大角度旋转
  while (smoothRotateX - rotateX.value > 180) smoothRotateX -= 360;
  while (smoothRotateX - rotateX.value < -180) smoothRotateX += 360;
  
  rotateX.value = smoothRotateX;
  rotateY.value = smoothRotateY;
}

onMounted(async () => {
  await nextTick()
  console.log('CubeView mounted, cubeBody:', cubeBody.value)
  // 监听相机旋转变化事件
  const cubeElement = document.querySelector('.cube')
  if (cubeElement) {
    cubeElement.addEventListener('camera-rotation-change', handleCameraRotationChange)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  const cubeElement = document.querySelector('.cube')
  if (cubeElement) {
    cubeElement.removeEventListener('camera-rotation-change', handleCameraRotationChange)
  }
})
</script>