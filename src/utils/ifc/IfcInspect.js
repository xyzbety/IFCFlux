// import ifcsgpset from './h_ifc.json';
import hifc1 from './sgpset/HIFC基础数据v20250728.json';
import hifc2 from './sgpset/HIFC规划报建v20250728.json';
import hifc3 from './sgpset/HIFC施工图审查v20250728.json';
import hifc4 from './sgpset/HIFC智慧工地监管v20250728.json';
import hifc5 from './sgpset/HIFC竣工验收v20250728.json';
const ifcsgpset2 = {
    1: hifc1['data_sheet'],
    2: hifc2['data_sheet'],
    3: hifc3['data_sheet'],
    4: hifc4['data_sheet'],
    5: hifc5['data_sheet'],
};
export class IfcInspect {
    constructor(url, type = 1) {
        this.processing = false;
        this.baseUrl = '';
        this.file = null;
        this.url = url;
        this.baseUrl = window.location.origin;
        this.ifcsgpset = ifcsgpset2[type];
        this.init();
    }
    async init() {
        if (this.url instanceof File) {
            this.file = this.url;
        }
        else {
            const isWebUrl = this.isWebUrl(this.url);
            if (isWebUrl) {
                this.file = await this.urlToFile(this.url);
            }
        }
        this.run();
    }
    isWebUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch (e) {
            return false;
        }
    }
    async urlToFile(url) {
        const filename = url.split('/').pop() || 'downloaded_file';
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, {
            type: blob.type,
            lastModified: Date.now()
        });
    }
    async run() {
        this.processing = true;
        const t0 = performance.now();
        const worker = new Worker(`${this.baseUrl}/extractor.worker.js`);
        const result = await new Promise((resolve) => {
            worker.postMessage({
                name: 'start',
                file: this.file,
                mapping: this.ifcsgpset,
            });
            worker.onmessage = (e) => {
                if (e.data.complete) {
                    worker.terminate();
                    resolve(e.data.result);
                }
            };
        });
        const t1 = performance.now();
        console.log(`Completed In ${((t1 - t0) / 1000).toFixed(2)}s`);
        // console.log(result);
        await this.timeout(500); //artifically wait 500ms
        this.processing = false;
        this.ifcData = result;
    }
    timeout(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, ms);
        });
    }
}
