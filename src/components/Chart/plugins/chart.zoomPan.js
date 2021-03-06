/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint no-param-reassign: off */

const wheelZoomFactor = 1.25;

const isTrackPad = evt => {
    if (evt.deltaX) return true;
    if (evt.wheelDeltaY) {
        if (evt.wheelDeltaY === evt.deltaY * -3) {
            return true;
        }
    } else if (evt.deltaMode === 0) {
        return true;
    }
    return false;
};

export default {
    id: 'zoomPan',

    beforeInit(chartInstance) {
        const zoomPan = {};
        chartInstance.zoomPan = zoomPan;

        const { canvas } = chartInstance.chart.ctx;

        zoomPan.zoomAtOriginBy = (
            pX,
            factorX,
            xMin,
            xMax,
            pY,
            factorY,
            yMin,
            yMax
        ) => {
            const zX = Math.max(factorX, 0.1);
            const newMinX = pX - (pX - xMin) / zX;
            const newMaxX = pX + (xMax - pX) / zX;
            if (pY !== undefined) {
                const zY = Math.max(factorY, 0.1);
                const newMinY = pY - (pY - yMin) / zY;
                const newMaxY = pY + (yMax - pY) / zY;
                zoomPan.callback(newMinX, newMaxX, newMinY, newMaxY);
                return;
            }
            zoomPan.callback(newMinX, newMaxX, null, null);
        };

        zoomPan.wheelHandler = event => {
            if (!zoomPan.callback) {
                return;
            }

            const { xScale, yScale } = chartInstance.scales;
            const { min: xMin, max: xMax, start: x0, end: x1, width } = xScale;
            const { min: yMin, max: yMax, start: y0, end: y1, height } = yScale;
            const { deltaX, deltaY } = event;
            const {
                left: xOffset,
                top: yOffset,
            } = event.target.getBoundingClientRect();

            if (isTrackPad(event)) {
                if (event.shiftKey) {
                    const pX =
                        xMin +
                        (xMax - xMin) *
                            ((event.clientX - xOffset - xScale.left) / width);
                    const pY =
                        yMax +
                        (yMin - yMax) *
                            ((event.clientY - yOffset - yScale.top) / height);
                    const fx = 1.01 ** deltaX;
                    const fy = 1.01 ** deltaY;
                    zoomPan.zoomAtOriginBy(
                        pX,
                        fx,
                        xMin,
                        xMax,
                        pY,
                        fy,
                        yMin,
                        yMax
                    );
                } else {
                    const fx = (x1 - x0) / width;
                    const fy = (y0 - y1) / height;
                    const dx = fx * deltaX;
                    const dy = fy * deltaY;
                    zoomPan.callback(
                        xMin + dx,
                        xMax + dx,
                        yMin + dy,
                        yMax + dy
                    );
                }
                return;
            }

            let z = 0;
            if (deltaY < 0) {
                z = wheelZoomFactor;
            } else if (deltaY > 0) {
                z = 1 / wheelZoomFactor;
            } else {
                return;
            }
            const p = xScale.getValueForPixel(event.clientX - xOffset);
            zoomPan.zoomAtOriginBy(p, z, xMin, xMax);
        };
        canvas.addEventListener('wheel', zoomPan.wheelHandler);

        zoomPan.pointerDownHandler = event => {
            if (!zoomPan.callback) {
                return;
            }
            if (event.button === 1) {
                // reset min-max window
                zoomPan.callback();
                return;
            }
            if (event.shiftKey) {
                return;
            }
            if (event.button === 0 || event.button === 2) {
                const type = event.button === 2 ? 'zoom' : 'pan';
                const { xScale, yScale } = chartInstance.scales;
                const { min: xMin, max: xMax } = xScale;
                const { max: yMin, min: yMax } = yScale;
                const {
                    left: xOffset,
                    top: yOffset,
                } = event.target.getBoundingClientRect();
                const pX =
                    xMin +
                    (xMax - xMin) *
                        ((event.clientX - xOffset - xScale.left) /
                            xScale.width);
                const pY =
                    yMin +
                    (yMax - yMin) *
                        ((event.clientY - yOffset - yScale.top) /
                            yScale.height);

                zoomPan.dragStart = {
                    type,
                    pX,
                    pY,
                    xMin,
                    xMax,
                    yMin,
                    yMax,
                };
            }
            event.preventDefault();
        };
        canvas.addEventListener('pointerdown', zoomPan.pointerDownHandler);

        zoomPan.pointerMoveHandler = ({
            pointerId,
            target,
            clientX,
            clientY,
        }) => {
            if (!zoomPan.dragStart) {
                return;
            }
            target.setPointerCapture(pointerId);
            zoomPan.dragStart.moved = true;
            const { xMin, xMax, yMin, yMax, pX, pY } = zoomPan.dragStart;
            const { xScale, yScale } = chartInstance.scales;
            const {
                left: xOffset,
                top: yOffset,
            } = target.getBoundingClientRect();
            const qX =
                xMin +
                (xMax - xMin) *
                    ((clientX - xOffset - xScale.left) / xScale.width);
            const qY =
                yMin +
                (yMax - yMin) *
                    ((clientY - yOffset - yScale.top) / yScale.height);

            if (zoomPan.dragStart.type === 'pan') {
                zoomPan.callback(
                    xMin + (pX - qX),
                    xMax + (pX - qX),
                    null,
                    null
                );
                return;
            }

            const zX = (wheelZoomFactor * 4) ** ((qX - pX) / (xMax - xMin));
            const zY = (wheelZoomFactor * 4) ** ((qY - pY) / (yMax - yMin));
            zoomPan.zoomAtOriginBy(pX, zX, xMin, xMax, pY, zY, yMin, yMax);
        };
        canvas.addEventListener(
            'pointermove',
            zoomPan.pointerMoveHandler,
            false
        );

        zoomPan.pointerUpHandler = () => {
            if (
                zoomPan.dragStart &&
                zoomPan.dragStart.type === 'zoom' &&
                !zoomPan.dragStart.moved
            ) {
                zoomPan.callback();
            }
            zoomPan.dragStart = null;
        };
        canvas.addEventListener('pointerup', zoomPan.pointerUpHandler, false);
        canvas.addEventListener(
            'pointerleave',
            zoomPan.pointerUpHandler,
            false
        );
    },
};
