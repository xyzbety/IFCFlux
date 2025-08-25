import * as BABYLON from "@babylonjs/core";
import { Tile } from './Tile';
/**
 * EarthTool 类提供了一系列静态方法和属性，用于处理与地球相关的地理计算、瓦片管理以及坐标转换等功能。
 */
export class EarthTool {
    /**
     * 计算当前视野下可见的瓦片集合。
     * @param xOffset - X轴偏移量
     * @param yOffset - Y轴偏移量
     * @param level - 当前缩放级别
     * @param radius - 计算半径
     * @param adjustOffset - 是否调整偏移量
     * @returns 可见瓦片的数组
     */
    static ComputeVisibleTiles(xOffset, yOffset, level, radius, adjustOffset, useRightHandedSystem) {
        if (adjustOffset) {
            xOffset -= 3;
            yOffset -= 3;
        }
        const visibleTiles = [];
        const tileCountAtLevel = Math.pow(2, level);
        const tileSize = EarthTool.Size / tileCountAtLevel;
        let accumulatedLatitude = 0;
        let accumulatedLongitude = 0;
        let halfLatitude = 180;
        let totalLongitude = 360;
        // 计算累积的纬度和经度
        for (let e = 0; e < level; e++) {
            halfLatitude /= 2;
            totalLongitude /= 2;
            accumulatedLatitude += halfLatitude;
            accumulatedLongitude += totalLongitude;
        }
        const minLatitude = -accumulatedLatitude;
        const maxLatitude = accumulatedLatitude;
        for (let m = yOffset; m < yOffset + radius; m++) {
            for (let i = xOffset; i < xOffset + radius; i++) {
                // 跳过负值索引
                if (m < 0 || i < 0)
                    continue;
                let globalX = -(accumulatedLongitude + minLatitude - i * tileSize);
                // 右手坐标系
                if (useRightHandedSystem) {
                    globalX = -globalX;
                }
                const globalY = maxLatitude - m * tileSize;
                // 跳过超出瓦片数量的索引
                if (m > tileCountAtLevel - 1 || i > tileCountAtLevel - 1)
                    continue;
                const quadKey = EarthTool.TileXYToQuadKey(i, m, level);
                visibleTiles.push(new Tile(globalX, globalY, level, i, m, tileCountAtLevel, quadKey));
            }
        }
        return visibleTiles;
    }
    /**
     * 将摄像机坐标转换为地理坐标（纬度和经度）。
     * @param x - 摄像机X坐标
     * @param y - 摄像机Y坐标
     * @returns 地理坐标的 Vector2 对象（x 为纬度，y 为经度）
     */
    static CameraToLatlong(x, y, useRightHandedSystem) {
        const latitude = -(x % EarthTool.PIX2 * 180 / Math.PI - 90);
        let longitude = y % EarthTool.PIX2;
        if (longitude < 0) {
            longitude += EarthTool.PIX2;
        }
        longitude *= 180 / Math.PI;
        if (longitude > 180) {
            longitude -= 360;
        }
        // 右手坐标系
        if (useRightHandedSystem) {
            longitude = -longitude;
        }
        return new BABYLON.Vector2(latitude, longitude);
    }
    /**
   * 将地理坐标（纬度和经度）转换为摄像机坐标。
   * @param latitude - 纬度（度），范围 [-90, 90]
   * @param longitude - 经度（度），范围 [-180, 180]
   * @param useRightHandedSystem - 是否使用右手坐标系
   * @returns 摄像机坐标的 Vector2 对象（x 为 beta，y 为 alpha）
   */
    static LatlongToCamera(longitude, latitude, useRightHandedSystem) {
        const x = ((90 - latitude) / 180) * Math.PI;
        const y = useRightHandedSystem ? -longitude * (Math.PI / 180) : longitude * (Math.PI / 180);
        return new BABYLON.Vector2(x, y);
    }
    /**
     * 设置地图级别数组，预计算每个级别对应的地图尺寸。
     * 通常用于初始化时调用。
     */
    static SetLevel() {
        for (let t = 0; t < 21; t++) {
            EarthTool.Levels.push(512 * Math.pow(2, t));
        }
    }
    /**
     * 根据视图角度和设备像素比率，获取最佳的地图级别分辨率。
     * @param viewAngle - 视图角度
     * @param resolution - 当前分辨率
     * @returns 最佳级别分辨率
     */
    // static GetBestLevelResolution(viewAngle: number, resolution: number): number {
    //   const deviceAdjustedResolution: number = window.devicePixelRatio * resolution;
    //   const tangent: number = Math.tan(viewAngle / 50 * 0.5);
    //   let bestLevel: number = 0;
    //   for (bestLevel = 0; bestLevel < EarthTool.Levels.length; bestLevel++) {
    //     if (tangent * EarthTool.Levels[bestLevel] >= deviceAdjustedResolution) {
    //       return bestLevel === 0 ? 1 : bestLevel;
    //     }
    //   }
    //   return bestLevel - 1;
    // }
    static GetBestLevelResolution(viewAngle, resolution) {
        // 获取设备像素比率
        const devicePixelRatio = window.devicePixelRatio * resolution || 1;
        // 获取视图的宽度和高度（以像素为单位）
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        // 计算缩放后的基准像素
        const scaledBase = devicePixelRatio * resolution;
        // 计算基于参数 t 的比例因子
        const r = Math.tan((viewAngle / 50) * 0.5);
        // 计算视图的宽度和高度在逻辑单位下的尺寸
        const viewLogicalWidth = viewWidth / devicePixelRatio;
        const viewLogicalHeight = viewHeight / devicePixelRatio;
        // 遍历所有瓦片级别，选择最适合的级别
        for (let o = 0; o < EarthTool.Levels.length; o++) {
            // 当前级别瓦片的像素大小
            const tilePixelSize = EarthTool.Levels[o] * r;
            // 计算当前级别下，每个瓦片在屏幕上的实际像素大小
            const tileScreenSize = tilePixelSize * devicePixelRatio;
            // 计算需要的瓦片数量以填充视图
            const tilesRequiredWidth = Math.ceil(viewWidth / tileScreenSize);
            const tilesRequiredHeight = Math.ceil(viewHeight / tileScreenSize);
            // 检查瓦片大小是否足够填充视图
            if (tilesRequiredWidth > 0 && tilesRequiredHeight > 0 && tileScreenSize >= scaledBase) {
                return o === 0 ? 1 : o;
            }
        }
        // 如果所有级别都不满足条件，返回最高级别
        return EarthTool.Levels.length - 1;
    }
    /**
     * 将地理坐标（纬度和经度）转换为3D向量坐标。
     * @param latitude - 纬度
     * @param longitude - 经度
     * @param radiusOffset - 半径偏移量
     * @returns 3D向量坐标
     */
    static LatLongToVec3(latitude, longitude, radiusOffset, useRightHandedSystem) {
        EarthTool.RadiusOffset = radiusOffset;
        EarthTool.Phi = (90 - latitude) * (Math.PI / 180);
        EarthTool.Theta = longitude * (Math.PI / 180);
        const x = EarthTool.RadiusOffset * Math.sin(EarthTool.Phi) * Math.cos(EarthTool.Theta);
        const y = EarthTool.RadiusOffset * Math.cos(EarthTool.Phi);
        const z = EarthTool.RadiusOffset * Math.sin(EarthTool.Phi) * Math.sin(EarthTool.Theta);
        // 右手坐标系
        if (useRightHandedSystem) {
            return new BABYLON.Vector3(x, y, -z);
        }
        return new BABYLON.Vector3(x, y, z);
    }
    /**
     * 将3D向量坐标转换为地理坐标（纬度和经度）。
     * @param vector - 3D向量坐标
     * @returns 地理坐标的 Vector2 对象（x 为纬度，y 为经度）
     */
    static Vec3ToLatLong(vector, useRightHandedSystem) {
        const latLong = BABYLON.Vector2.Zero();
        latLong.x = 90 - 180 * Math.acos(vector.y / vector.length()) / Math.PI;
        // 右手坐标系
        if (useRightHandedSystem) {
            latLong.y = ((270 + 180 * Math.atan2(-vector.x, -vector.z) / Math.PI) % 360 - 180);
        }
        else {
            latLong.y = -((270 + 180 * Math.atan2(-vector.x, -vector.z) / Math.PI) % 360 - 180);
        }
        return latLong;
    }
    /**
     * 使用逆Web Mercator投影将坐标转换为3D向量。
     * @param x - X坐标
     * @param y - Y坐标
     * @param z - Z坐标
     * @returns 3D向量
     */
    static InverseWebMercator(x, y, z) {
        const invWebMercatorX = x * EarthTool.INV_POLE_BY_180;
        const invWebMercatorZ = EarthTool.RADB2 * Math.atan(Math.exp(y * EarthTool.PI_BY_POLE)) - EarthTool.INV_PI_BY_180_HALF_PI;
        return new BABYLON.Vector3(invWebMercatorX, z, invWebMercatorZ);
    }
    /**
     * 将一个数值映射到一个指定的区间内。
     * @param value - 需要映射的数值
     * @param fromMin - 原区间的最小值
     * @param fromMax - 原区间的最大值
     * @param toMin - 目标区间的最小值
     * @param toMax - 目标区间的最大值
     * @returns 映射后的数值
     */
    static MapNumberToInterval(value, fromMin, fromMax, toMin, toMax) {
        return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
    }
    /**
     * 计算地面分辨率。
     * @param latitude - 纬度
     * @param level - 缩放级别
     * @returns 地面分辨率（单位：米/像素）
     */
    static GroundResolution(latitude, level) {
        latitude = EarthTool.Clip(latitude, EarthTool.MinLatitude, EarthTool.MaxLatitude);
        const groundResolution = 2 * Math.cos(latitude * Math.PI / 180) * Math.PI * EarthTool.EarthRadius / EarthTool.MapSize(level);
        return groundResolution;
    }
    /**
     * 将地理坐标（纬度和经度）转换为像素坐标。
     * @param latitude - 纬度
     * @param longitude - 经度
     * @param level - 缩放级别
     * @returns 像素坐标的 Vector2 对象
     */
    static LatLongToPixelXY(latitude, longitude, level) {
        latitude = EarthTool.Clip(latitude, EarthTool.MinLatitude, EarthTool.MaxLatitude);
        longitude = EarthTool.Clip(longitude, EarthTool.MinLongitude, EarthTool.MaxLongitude);
        const normalizedX = (longitude + 180) / 360;
        const sinLatitude = Math.sin(latitude * Math.PI / 180);
        const normalizedY = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
        const mapSize = EarthTool.MapSize(level);
        const pixelX = EarthTool.Clip(normalizedX * mapSize + 0.5, 0, mapSize - 1);
        const pixelY = EarthTool.Clip(normalizedY * mapSize + 0.5, 0, mapSize - 1);
        return new BABYLON.Vector2(pixelX, pixelY);
    }
    /**
     * 将指定的值限制在一个区间内。
     * @param value - 需要限制的值
     * @param min - 最小值
     * @param max - 最大值
     * @returns 限制后的值
     */
    static Clip(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    /**
     * 将像素坐标转换为瓦片坐标。
     * @param pixelX - 像素X坐标
     * @param pixelY - 像素Y坐标
     * @returns 瓦片坐标的 Vector2 对象
     */
    static PixelXYToTileXY(pixelX, pixelY) {
        const tileX = Math.floor(pixelX / 256);
        const tileY = Math.floor(pixelY / 256);
        return new BABYLON.Vector2(tileX, tileY);
    }
    /**
     * 将像素坐标转换为地理坐标（纬度和经度）。
     * @param pixelX - 像素X坐标
     * @param pixelY - 像素Y坐标
     * @param level - 缩放级别
     * @returns 地理坐标的 Vector2 对象（x 为纬度，y 为经度）
     */
    static PixelXYToLatLong(pixelX, pixelY, level) {
        const mapSize = EarthTool.MapSize(level);
        const normalizedX = EarthTool.Clip(pixelX, 0, mapSize - 1) / mapSize - 0.5;
        const normalizedY = 0.5 - EarthTool.Clip(pixelY, 0, mapSize - 1) / mapSize;
        const latitude = 90 - 360 * Math.atan(Math.exp(2 * -normalizedY * Math.PI)) / Math.PI;
        const longitude = 360 * normalizedX;
        return new BABYLON.Vector2(latitude, longitude);
    }
    /**
     * 计算地图的整体尺寸（瓦片数量）。
     * @param level - 缩放级别
     * @returns 地图尺寸
     */
    static MapSize(level) {
        return 256 << level;
    }
    /**
     * 将瓦片坐标转换为像素坐标。
     * @param tileX - 瓦片X坐标
     * @param tileY - 瓦片Y坐标
     * @returns 像素坐标的 Vector2 对象
     */
    static TileXYToPixelXY(tileX, tileY) {
        return new BABYLON.Vector2(256 * tileX, 256 * tileY);
    }
    /**
     * 计算两个地理坐标点之间的距离（单位：米）。
     * 使用 Haversine 公式计算大圆距离。
     * @param lat1 - 第一个点的纬度
     * @param lon1 - 第一个点的经度
     * @param lat2 - 第二个点的纬度
     * @param lon2 - 第二个点的经度
     * @returns 两点之间的距离（单位：米）
     */
    static GetDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const earthRadiusKm = EarthTool.EarthRadius / 1000;
        const deltaLat = EarthTool.Deg2rad(lat2 - lat1);
        const deltaLon = EarthTool.Deg2rad(lon2 - lon1);
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(EarthTool.Deg2rad(lat1)) * Math.cos(EarthTool.Deg2rad(lat2)) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // 返回距离，单位：米
        return earthRadiusKm * (c * 1000);
    }
    /**
     * 将角度转换为弧度。
     * @param degrees - 角度值
     * @returns 弧度值
     */
    static Deg2rad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * 将瓦片坐标转换为四叉树关键字（QuadKey）。
     * 四叉树关键字用于唯一标识瓦片的位置。
     * @param tileX - 瓦片X坐标
     * @param tileY - 瓦片Y坐标
     * @param level - 瓦片级别
     * @returns 四叉树关键字字符串
     */
    static TileXYToQuadKey(tileX, tileY, level) {
        let quadKey = "";
        for (let i = level; i > 0; i--) {
            let digit = 0;
            const mask = 1 << (i - 1);
            if ((tileX & mask) !== 0) {
                digit += 1;
            }
            if ((tileY & mask) !== 0) {
                digit += 2;
            }
            quadKey += digit.toString();
        }
        return quadKey;
    }
    /**
     * 计算地图的缩放比例。
     * @param groundResolution - 地面分辨率
     * @param mapScaleFactor - 地图缩放因子
     * @param inchesToMeters - 英寸到米的转换比例
     * @returns 地图缩放比例
     */
    static MapScale(groundResolution, mapScaleFactor, inchesToMeters) {
        return EarthTool.GroundResolution(groundResolution, mapScaleFactor) * inchesToMeters / 0.0254;
    }
    /**
   * 将瓦片坐标转换为地理坐标（纬度和经度）。
   * @param tileX - 瓦片X坐标
   * @param tileY - 瓦片Y坐标
   * @param level - 瓦片级别
   * @returns 地理坐标的 Vector2 对象（x 为纬度，y 为经度）
   */
    static TileXYToLatLon(tileX, tileY, level) {
        const n = Math.pow(2, level);
        const lon_deg = tileX / n * 360.0 - 180.0;
        const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / n)));
        const lat_deg = lat_rad * (180.0 / Math.PI);
        return new BABYLON.Vector2(lat_deg, lon_deg);
    }
    /**
     * 将四叉树关键字（QuadKey）转换为瓦片坐标。
     * @param quadKey - 四叉树关键字字符串
     * @returns 包含瓦片坐标和级别的对象 {tileX: number, tileY: number, level: number}
     */
    static QuadKeyToTileXY(quadKey) {
        let tileX = 0;
        let tileY = 0;
        const level = quadKey.length;
        for (let i = level; i > 0; i--) {
            const mask = 1 << (i - 1);
            const digit = parseInt(quadKey[level - i]);
            // 解析 X 坐标
            if ((digit === 1) || (digit === 3)) {
                tileX |= mask;
            }
            // 解析 Y 坐标
            if ((digit === 2) || (digit === 3)) {
                tileY |= mask;
            }
        }
        return {
            tileX: tileX,
            tileY: tileY,
            level: level
        };
    }
    /**
     * 将平面坐标转换为球面坐标。
     * @param x 经度
     * @param y 纬度
     * @param z 高度
     * @returns Babylon.js 的 Vector3 对象表示的球面坐标
     */
    static spherify(x, y, z, useRightHandedSystem = false) {
        const latitudeRad = (90 - y) / 180 * Math.PI; // 纬度转换为弧度
        const longitudeRad = x / 180 * Math.PI; // 经度转换为弧度
        // 计算球面坐标，加上地形高度 z
        const radiusWithHeight = EarthTool.EarthRadius + z; // 加上地形高度
        // 计算球面坐标
        const vector = new BABYLON.Vector3(radiusWithHeight * Math.sin(latitudeRad) * Math.cos(longitudeRad), // X 轴
        radiusWithHeight * Math.cos(latitudeRad), // Y 轴
        radiusWithHeight * Math.sin(latitudeRad) * Math.sin(longitudeRad) // Z 轴
        );
        if (useRightHandedSystem) {
            vector.z = -vector.z;
        }
        return vector;
    }
    /**
     * 获取所有子瓦片的四叉树关键字和其在父瓦片中的二维坐标位置。
     *
     * @param parentKey - 父瓦片的四叉树关键字。
     * @param multiple - 子瓦片与父瓦片的层级差。
     * @returns 返回一个包含所有子瓦片四叉树关键字和位置的数组。
     */
    static getAllChildTilesWithPosition(parentKey, multiple) {
        if (multiple < 1) {
            throw new Error("multiple must be at least 1");
        }
        const results = [];
        /**
         * 递归生成子瓦片关键字和位置。
         *
         * @param currentKey - 当前生成的四叉树关键字。
         * @param xOffset - 当前生成的 x 坐标偏移。
         * @param yOffset - 当前生成的 y 坐标偏移。
         * @param depth - 当前递归的深度。
         * @param step - 当前递归所对应的步长，用于计算坐标偏移。
         */
        function recurse(currentKey, xOffset, yOffset, depth, step) {
            if (depth === 0) {
                results.push({
                    childKey: currentKey,
                    position: { x: xOffset, y: yOffset },
                });
                return;
            }
            // 每次递归步长减半，以决定子节点在当前层的偏移
            const newStep = step / 2;
            for (let i = 0; i < 4; i++) {
                // 四叉树的四个子节点对应的相对位置
                // 子节点0: 左上 (x, y) = (0, 0)
                // 子节点1: 右上 (x, y) = (1, 0)
                // 子节点2: 左下 (x, y) = (0, 1)
                // 子节点3: 右下 (x, y) = (1, 1)
                const dx = i % 2;
                const dy = Math.floor(i / 2);
                recurse(currentKey + i.toString(), xOffset * 2 + dx, yOffset * 2 + dy, depth - 1, newStep);
            }
        }
        ``;
        // 初始化递归，起始偏移为 0,0，步长为 1
        recurse(parentKey, 0, 0, multiple, 1);
        return results;
    }
    /**
     * 在指定经纬度位置创建一个 ENU 坐标系下的模型
     * @param modelMesh - 要放置的模型
     * @param longitude - 经度
     * @param latitude - 纬度
     * @param height - 高度（米）
     * @param scene - Babylon场景
     * @returns TransformNode - ENU坐标系的根节点
     */
    static createModelInENU(modelMesh, longitude, latitude, height, scene) {
        // 计算参考点的 ECEF 坐标
        const referenceECEF = EarthTool.spherify(longitude, latitude, height, scene.useRightHandedSystem);
        // 创建 ENU 坐标系的根节点 
        const enuRoot = new BABYLON.TransformNode("enuRoot", scene);
        enuRoot.position = referenceECEF.add(BABYLON.Vector3.Zero());
        ;
        // 计算从 ECEF 到 ENU 的旋转矩阵
        const radLat = BABYLON.Angle.FromDegrees(latitude).radians();
        const radLon = BABYLON.Angle.FromDegrees(longitude).radians();
        const rotationMatrix = BABYLON.Matrix.FromValues(-Math.sin(radLon), -Math.cos(radLon) * Math.sin(radLat), 0, 0, Math.cos(radLon), -Math.sin(radLon) * Math.sin(radLat), Math.cos(radLat), 0, 0, Math.cos(radLat), Math.sin(radLat), 0, 0, 0, 0, 1);
        // 应用旋转
        const rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        // 如果在右手坐标系中，需要额外旋转
        if (scene.useRightHandedSystem) {
            // 创建绕X轴旋转180度的四元数
            const flipQuaternion = BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(180), 0, BABYLON.Tools.ToRadians(-45));
            // 合并旋转
            enuRoot.rotationQuaternion = rotationQuaternion.multiply(flipQuaternion);
        }
        else {
            enuRoot.rotationQuaternion
                = rotationQuaternion;
        }
        // 将模型设置为 ENU 根节点的子节点
        modelMesh.parent = enuRoot;
        return enuRoot;
    }
    static sourceModelInENU(longitude, latitude, height, scene) {
        // 计算参考点的 ECEF 坐标
        const referenceECEF = EarthTool.spherify(longitude, latitude, height, scene.useRightHandedSystem);
        // 创建 ENU 坐标系的根节点 
        const enuRoot = new BABYLON.TransformNode("enuRoot", scene);
        enuRoot.position = referenceECEF.add(BABYLON.Vector3.Zero());
        // enuRoot.position = new BABYLON.Vector3(0, 0, height);;
        // 计算从 ECEF 到 ENU 的旋转矩阵
        const radLat = BABYLON.Angle.FromDegrees(latitude).radians();
        const radLon = BABYLON.Angle.FromDegrees(longitude).radians();
        const rotationMatrix = BABYLON.Matrix.FromValues(-Math.sin(radLon), -Math.cos(radLon) * Math.sin(radLat), 0, 0, Math.cos(radLon), -Math.sin(radLon) * Math.sin(radLat), Math.cos(radLat), 0, 0, Math.cos(radLat), Math.sin(radLat), 0, 0, 0, 0, 1);
        // 应用旋转
        const rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        // 如果在右手坐标系中，需要额外旋转
        if (scene.useRightHandedSystem) {
            // 创建绕X轴旋转180度的四元数
            const flipQuaternion = BABYLON.Quaternion.FromEulerAngles(BABYLON.Tools.ToRadians(180), 0, BABYLON.Tools.ToRadians(-45));
            // 合并旋转
            enuRoot.rotationQuaternion = rotationQuaternion.multiply(flipQuaternion);
        }
        else {
            enuRoot.rotationQuaternion
                = rotationQuaternion;
        }
        return enuRoot;
    }
    static geodeticToECEF(lat, lon, alt) {
        const a = 6378137.0; // 地球长半轴 (米)
        const e2 = 6.69437999014e-3; // 离心率平方
        const radLat = BABYLON.Tools.ToRadians(lat);
        const radLon = BABYLON.Tools.ToRadians(lon);
        const N = a / Math.sqrt(1 - e2 * Math.sin(radLat) ** 2);
        const x = (N + alt) * Math.cos(radLat) * Math.cos(radLon);
        const y = (N + alt) * Math.cos(radLat) * Math.sin(radLon);
        const z = ((1 - e2) * N + alt) * Math.sin(radLat);
        return new BABYLON.Vector3(x, y, -z);
    }
    static ecefToENU(targetECEF, refECEF, refLat, refLon) {
        const radLat = BABYLON.Tools.ToRadians(refLat);
        const radLon = BABYLON.Tools.ToRadians(refLon);
        const dx = targetECEF.x - refECEF.x;
        const dy = targetECEF.y - refECEF.y;
        const dz = targetECEF.z - refECEF.z;
        const east = -Math.sin(radLon) * dx + Math.cos(radLon) * dy;
        const north = -Math.sin(radLat) * Math.cos(radLon) * dx
            - Math.sin(radLat) * Math.sin(radLon) * dy
            + Math.cos(radLat) * dz;
        const up = Math.cos(radLat) * Math.cos(radLon) * dx
            + Math.cos(radLat) * Math.sin(radLon) * dy
            + Math.sin(radLat) * dz;
        return new BABYLON.Vector3(east, north, up);
    }
    static enuToEcef(e, n, u, lat0, lon0, x0, y0, z0) {
        const latRad = BABYLON.Tools.ToRadians(lat0);
        const lonRad = BABYLON.Tools.ToRadians(lon0);
        const t = BABYLON.Matrix.FromValues(-Math.sin(lonRad), Math.cos(lonRad), 0, 0, -Math.sin(latRad) * Math.cos(lonRad), -Math.sin(latRad) * Math.sin(lonRad), Math.cos(latRad), 0, Math.cos(latRad) * Math.cos(lonRad), Math.cos(latRad) * Math.sin(lonRad), Math.sin(latRad), 0, 0, 0, 0, 1);
        const enu = new BABYLON.Vector3(e, n, u);
        const ecefOffset = BABYLON.Vector3.TransformCoordinates(enu, t);
        return ecefOffset.add(new BABYLON.Vector3(x0, y0, z0));
    }
    /**
     * 解析slpk格式的bin文件
     * @param arrayBuffer - bin文件二进制数据
     * @param jsonBuffer - slpk的json数据
     * @param featureCount - 特征数
     * @param vertexCount - 顶点数
     * @returns ['position', 'normal', 'uv0', 'uv1', 'color', 'uvRegion', 'featureId', 'faceRange']
     */
    static parseGeometryBuffer(arrayBuffer, jsonBuffer, featureCount, vertexCount) {
        try {
            const readField = (dataView, count, offset, { component, type }, targetArray) => {
                for (let c = 0; c < count; c++) {
                    for (let i = 0; i < component; i++) {
                        switch (type) {
                            case "Float32":
                                targetArray.push(dataView.getFloat32(offset, true));
                                offset += 4;
                                break;
                            case "UInt8":
                                targetArray.push(dataView.getUint8(offset) / 255); // 归一化到 0-1
                                offset += 1;
                                break;
                            case "UInt16":
                                targetArray.push(dataView.getUint16(offset, true));
                                offset += 2;
                                break;
                            case "UInt32":
                                targetArray.push(dataView.getUint32(offset, true));
                                offset += 4;
                                break;
                            case "UInt64":
                                // JavaScript 不直接支持 Uint64，近似处理
                                // const low = dataView.getUint32(offset, true);
                                // const high = dataView.getUint32(offset + 4, true);
                                // targetArray.push(low + high * 4294967296);
                                // targetArray.push(dataView.getBigInt64(offset, true));
                                // let signed = dataView.getBigInt64(offset, true);
                                // let unsigned = signed >= 0 ? signed : signed + BigInt(2n ** 64n);
                                targetArray.push(dataView.getBigUint64(offset, true));
                                offset += 8;
                                break;
                            default:
                                throw new Error(`Unsupported type: ${type}`);
                        }
                    }
                }
                return offset;
            };
            const dataView = new DataView(arrayBuffer);
            const fields = jsonBuffer[0];
            let offset = fields.offset || 0; // 默认偏移为 0
            const result = {};
            const vertexField = ['position', 'normal', 'uv0', 'uv1', 'color', 'uvRegion'];
            const featurnFild = ['featureId', 'faceRange'];
            for (let j = 0; j < vertexField.length; j++) {
                const field = vertexField[j];
                if (fields[field]) {
                    result[field] = [];
                    offset = readField(dataView, vertexCount, offset, fields[field], result[field]);
                }
            }
            for (let j = 0; j < featurnFild.length; j++) {
                const field = featurnFild[j];
                if (fields[field]) {
                    result[field] = [];
                    offset = readField(dataView, featureCount, offset, fields[field], result[field]);
                }
            }
            return result;
        }
        catch (error) {
            console.error('解析几何缓冲区失败:', error);
            return null;
        }
    }
}
/** EPSG3857 投影的最大边界值 */
EarthTool.EPSG3857_MAX_BOUND = 20037508.34;
/** 每180度对应的逆比例值 */
EarthTool.INV_POLE_BY_180 = 180 / EarthTool.EPSG3857_MAX_BOUND;
/** 每极半周角对应的比例值 */
EarthTool.PI_BY_POLE = Math.PI / EarthTool.EPSG3857_MAX_BOUND;
/** 半π，表示90度 */
EarthTool.PID2 = 0.5 * Math.PI;
/** 2π，表示360度 */
EarthTool.PIX2 = 2 * Math.PI;
/** 度与弧度的转换比例 */
EarthTool.RAD = 180 / Math.PI;
/** RADB2 的计算结果 */
EarthTool.RADB2 = 2 * EarthTool.RAD;
/** 每360度对应的半周角值 */
EarthTool.PID360 = Math.PI / 360;
/** 逆比例与180度半周角之间的关系 */
EarthTool.INV_PI_BY_180_HALF_PI = EarthTool.RAD * EarthTool.PID2;
/** 地球的平均半径（单位：米） */
EarthTool.EarthRadius = 6378137;
/** 地球半径缩放比例 */
EarthTool.RadiusFactor = 0.0001;
/** 最小纬度（用于Web Mercator投影，避免极地区域失真） */
EarthTool.MinLatitude = -85.05112878;
/** 最大纬度（用于Web Mercator投影，避免极地区域失真） */
EarthTool.MaxLatitude = 85.05112878;
/** 最小经度 */
EarthTool.MinLongitude = -180;
/** 最大经度 */
EarthTool.MaxLongitude = 180;
/** 地图的尺寸，通常表示全图的360度 */
EarthTool.Size = 360;
/** 瓦片级别数组，用于存储不同级别下的地图尺寸 */
EarthTool.Levels = [];
/** 瓦片当前 */
EarthTool.level = 1;
/** 是否修改相机目标为相机射线点 */
EarthTool.isDownthrust = false;
EarthTool.worldOriginPosition = new BABYLON.Vector3(0, 0, 0);
/** 相机最大缩放级别 */
EarthTool.maxLevel = 18;
/** 高度图最大缩放级别 */
EarthTool.maxHeightMapLevel = 13;
/** 开始加载高度地形的级别 */
EarthTool.startGround = 10;
/** 是否开启地形 */
EarthTool.isGround = false;
/** 缩放为球的最大层级 */
EarthTool.earthSphereLevel = 6;
/** 鼠标位置坐标 */
EarthTool.mousePointPosition = new BABYLON.Vector3(0, 0, 0);
/** 半径偏移量 */
EarthTool.RadiusOffset = 0;
/** 球面坐标的角度 Phi */
EarthTool.Phi = 0;
/** 球面坐标的角度 Theta */
EarthTool.Theta = 0;
