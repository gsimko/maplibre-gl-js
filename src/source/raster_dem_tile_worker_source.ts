import {DEMData} from '../data/dem_data';
import {RGBAImage} from '../util/image';
import type {Actor} from '../util/actor';
import type {
    WorkerDEMTileParameters,
    TileParameters
} from './worker_source';
import {getImageData, isImageBitmap} from '../util/util';

export class RasterDEMTileWorkerSource {
    actor: Actor;
    loaded: {[_: string]: DEMData};

    constructor() {
        this.loaded = {};
    }

    async loadTile(params: WorkerDEMTileParameters): Promise<DEMData | null> {
        const {uid, encoding, rawImageData, redFactor, greenFactor, blueFactor, baseShift} = params;
        const isBitmap = isImageBitmap(rawImageData);
        const width = rawImageData.width + (isBitmap ? 4 : 0);
        const height = rawImageData.height + (isBitmap ? 4 : 0);
        const imagePixels: RGBAImage | ImageData = isBitmap ?
            new RGBAImage({width, height}, await getImageData(rawImageData, -2, -2, width, height)) :
            rawImageData;
        const dem = new DEMData(uid, imagePixels, encoding, redFactor, greenFactor, blueFactor, baseShift);
        this.loaded = this.loaded || {};
        this.loaded[uid] = dem;
        return dem;
    }

    removeTile(params: TileParameters) {
        const loaded = this.loaded,
            uid = params.uid;
        if (loaded && loaded[uid]) {
            delete loaded[uid];
        }
    }
}
