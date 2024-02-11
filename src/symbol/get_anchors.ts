import {interpolates} from '@maplibre/maplibre-gl-style-spec';

import {Anchor} from '../symbol/anchor';
import {checkMaxAngle} from './check_max_angle';

import type Point from '@mapbox/point-geometry';
import type {Shaping, PositionedIcon} from './shaping';

export {getAnchors, getCenterAnchor};

function getLineLength(line: Array<Point>): number {
    let lineLength = 0;
    for (let k = 0; k < line.length - 1; k++) {
        lineLength += line[k].dist(line[k + 1]);
    }
    return lineLength;
}

function getAngleWindowSize(
    shapedText: Shaping,
    glyphSize: number,
    boxScale: number
): number {
    return shapedText ?
        3 / 5 * glyphSize * boxScale :
        0;
}

function getShapedLabelLength(shapedText?: Shaping | null, shapedIcon?: PositionedIcon | null): number {
    return Math.max(
        shapedText ? shapedText.right - shapedText.left : 0,
        shapedIcon ? shapedIcon.right - shapedIcon.left : 0);
}

function getCenterAnchor(line: Array<Point>,
    maxAngle: number,
    shapedText: Shaping,
    shapedIcon: PositionedIcon,
    glyphSize: number,
    boxScale: number) {
    const angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    const labelLength = getShapedLabelLength(shapedText, shapedIcon) * boxScale;

    let prevDistance = 0;
    const centerDistance = getLineLength(line) / 2;

    for (let i = 0; i < line.length - 1; i++) {

        const a = line[i],
            b = line[i + 1];

        const segmentDistance = a.dist(b);

        if (prevDistance + segmentDistance > centerDistance) {
            // The center is on this segment
            const t = (centerDistance - prevDistance) / segmentDistance,
                x = interpolates.number(a.x, b.x, t),
                y = interpolates.number(a.y, b.y, t);

            const anchor = new Anchor(x, y, b.angleTo(a), i);
            anchor._round();
            if (!angleWindowSize) {
                return anchor;
            } else {
                const { passed } = checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle);
                if (passed) return anchor;
                return;
            }
        }

        prevDistance += segmentDistance;
    }
}

function getAnchors(line: Array<Point>,
    spacing: number,
    maxAngle: number,
    shapedText: Shaping,
    shapedIcon: PositionedIcon,
    glyphSize: number,
    boxScale: number,
    overscaling: number,
    tileExtent: number) {

    // Resample a line to get anchor points for labels and check that each
    // potential label passes text-max-angle check and has enough room to fit
    // on the line.

    const angleWindowSize = getAngleWindowSize(shapedText, glyphSize, boxScale);
    const shapedLabelLength = getShapedLabelLength(shapedText, shapedIcon);
    const labelLength = shapedLabelLength * boxScale;

    // Is the line continued from outside the tile boundary?
    const isLineContinued = line[0].x === 0 || line[0].x === tileExtent || line[0].y === 0 || line[0].y === tileExtent;

    // Is the label long, relative to the spacing?
    // If so, adjust the spacing so there is always a minimum space of `spacing / 4` between label edges.
    if (spacing - labelLength < spacing / 4) {
        spacing = labelLength + spacing / 4;
    }

    // Offset the first anchor by:
    // Either half the label length plus a fixed extra offset if the line is not continued
    // Or half the spacing if the line is continued.

    // For non-continued lines, add a bit of fixed extra offset to avoid collisions at T intersections.
    const fixedExtraOffset = glyphSize * 2;

    const offset = !isLineContinued ?
        ((shapedLabelLength / 2 + fixedExtraOffset) * boxScale * overscaling) % spacing :
        (spacing / 2 * overscaling) % spacing;

    return resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, false, tileExtent);
}

function resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, placeAtMiddle, tileExtent) {

    const halfLabelLength = labelLength / 2;
    const lineLength = getLineLength(line);

    let distance = 0,
        subspacing = spacing / 4,  // the step size to look for best anchors
        minSpacing = spacing - 1e-5,  // epsilon-adjusted to not worry about floating point inaccuracies
        maxSpacing = 2 * spacing,
        markedDistance = offset - subspacing;

    let anchors = [];

    // We used to place anchors uniformly 'spacing' distance away from each other.
    // This often led to selecting suboptimal places, hence now we do a limited subsearch around each possible location.
    // We still guarantee that labels are at least 'spacing' away from each other.
    let bestAnchor = undefined,  // best anchor since the last placed anchor
        bestAngleDelta = Number.POSITIVE_INFINITY,  // corresponding max delta angle
        bestDistance = undefined,  // corresponding distance
        lastAnchorDistance = offset - spacing;  // distance at last placed anchor

    for (let i = 0; i < line.length - 1; i++) {

        const a = line[i],
            b = line[i + 1];

        const segmentDist = a.dist(b),
            angle = b.angleTo(a);

        while (markedDistance + subspacing < distance + segmentDist) {
            markedDistance += subspacing;
            // if we are at least maxSpacing away from the previous anchor and we have a best anchor, use it.
            if (markedDistance - lastAnchorDistance >= maxSpacing && bestAnchor) {
                anchors.push(bestAnchor);
                lastAnchorDistance = bestDistance;
                bestAnchor = undefined;
                bestAngleDelta = Number.POSITIVE_INFINITY;
            }
            // skip while we are less than 'spacing' away from the previous anchor
            if (markedDistance - lastAnchorDistance < minSpacing) continue;
            
            const t = (markedDistance - distance) / segmentDist,
                x = interpolates.number(a.x, b.x, t),
                y = interpolates.number(a.y, b.y, t);

            // Check that the point is within the tile boundaries and that
            // the label would fit before the beginning and end of the line
            // if placed at this point.
            if (x >= 0 && x < tileExtent && y >= 0 && y < tileExtent &&
                    markedDistance - halfLabelLength >= 0 &&
                    markedDistance + halfLabelLength <= lineLength) {
                const anchor = new Anchor(x, y, angle, i);
                anchor._round();

                if (!angleWindowSize) {
                    anchors.push(anchor);
                    lastAnchorDistance = markedDistance;
                } else {
                    const { passed, maxAngleDelta } = checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle);
                    if (passed && maxAngleDelta < bestAngleDelta) {
                        // This is a better position than anything before
                        bestAnchor = anchor;
                        bestAngleDelta = maxAngleDelta;
                        bestDistance = markedDistance;
                    }
                }
            }
        }
        distance += segmentDist;
    }
    // if we have a left-over best anchor, use it.
    if (bestAnchor) anchors.push(bestAnchor);

    if (!placeAtMiddle && !anchors.length && !isLineContinued) {
        // The first attempt at finding anchors at which labels can be placed failed.
        // Try again, but this time just try placing one anchor at the middle of the line.
        // This has the most effect for short lines in overscaled tiles, since the
        // initial offset used in overscaled tiles is calculated to align labels with positions in
        // parent tiles instead of placing the label as close to the beginning as possible.
        anchors = resample(line, distance / 2, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, true, tileExtent);
    }

    return anchors;
}
