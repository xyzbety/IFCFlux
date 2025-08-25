/**
 * Tile 类表示地图上的一个瓦片（Tile）。
 * 它包含了瓦片的位置偏移量、层级信息、坐标索引、面数以及四叉树关键字。
 */
export class Tile {
    /**
     * 创建一个Tile实例。
     * @param offsetX - 瓦片相对于左上角的X轴偏移量
     * @param offsetY - 瓦片相对于左上角的Y轴偏移量
     * @param level - 瓦片所在的层级（缩放级别）
     * @param X - 瓦片在水平方向上的索引
     * @param Y - 瓦片在垂直方向上的索引
     * @param nFaces - 瓦片的面数
     * @param quadKey - 瓦片的四叉树关键字
     */
    constructor(offsetX, offsetY, level, X, Y, nFaces, quadKey) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.level = level;
        this.X = X;
        this.Y = Y;
        this.nFaces = nFaces;
        this.quadKey = quadKey;
    }
    /**
     * 获取瓦片的全局X坐标。
     * 这是根据层级和索引计算得到的全局位置。
     * @returns 全局X坐标
     */
    getGlobalX() {
        return this.X * this.offsetX;
    }
    /**
     * 获取瓦片的全局Y坐标。
     * 这是根据层级和索引计算得到的全局位置。
     * @returns 全局Y坐标
     */
    getGlobalY() {
        return this.Y * this.offsetY;
    }
    /**
     * 更新瓦片的偏移量。
     * 这对于动态调整瓦片位置或缩放非常有用。
     * @param newOffsetX - 新的X轴偏移量
     * @param newOffsetY - 新的Y轴偏移量
     */
    updateOffset(newOffsetX, newOffsetY) {
        this.offsetX = newOffsetX;
        this.offsetY = newOffsetY;
    }
    /**
     * 生成瓦片的四叉树关键字。
     * 这是根据瓦片的层级和索引生成的唯一标识符。
     * @returns 生成的四叉树关键字
     */
    generateQuadKey() {
        let quadKey = "";
        let level = this.level;
        let X = this.X;
        let Y = this.Y;
        for (let i = level; i > 0; i--) {
            let digit = "0";
            const mask = 1 << (i - 1);
            if ((X & mask) !== 0) {
                digit = "1";
            }
            if ((Y & mask) !== 0) {
                digit = String.fromCharCode(digit.charCodeAt(0) + 1);
            }
            quadKey += digit;
        }
        this.quadKey = quadKey;
        return quadKey;
    }
}
