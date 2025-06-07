import {StyleLayer} from '../style_layer';

import properties, {type ContourPaintPropsPossiblyEvaluated} from './contour_style_layer_properties.g';
import {type Transitionable, type Transitioning, type PossiblyEvaluated} from '../properties';

import type {ContourPaintProps} from './contour_style_layer_properties.g';
import type {LayerSpecification} from '@maplibre/maplibre-gl-style-spec';

export const isContourStyleLayer = (layer: StyleLayer): layer is ContourStyleLayer => layer.type === 'contour';

export class ContourStyleLayer extends StyleLayer {
    _transitionablePaint: Transitionable<ContourPaintProps>;
    _transitioningPaint: Transitioning<ContourPaintProps>;
    paint: PossiblyEvaluated<ContourPaintProps, ContourPaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification) {
        super(layer, properties);
    }
}
