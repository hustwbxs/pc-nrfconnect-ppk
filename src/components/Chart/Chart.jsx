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

/* eslint no-bitwise: off */
/* eslint no-plusplus: off */
/* eslint operator-assignment: off */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { bool } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';

import ChartTop from './ChartTop';
import StatBox from './StatBox';
import TimeSpanTop from './TimeSpan/TimeSpanTop';
import TimeSpanBottom from './TimeSpan/TimeSpanBottom';
import DigitalChannels from './DigitalChannels';
import ChartContainer from './ChartContainer';

import {
    chartWindowAction,
    chartCursorAction,
    chartState,
} from '../../reducers/chartReducer';

import { options, timestampToIndex, nbDigitalChannels } from '../../globals';

import { rightMarginPx } from './chart.scss';
import { useLazyInitializedRef } from '../../hooks/useLazyInitializedRef';

const rightMargin = parseInt(rightMarginPx, 10);

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));

const calcStats = (data, _begin, _end, index) => {
    if (_begin === null || _end === null) {
        return null;
    }
    let begin = _begin;
    let end = _end;
    if (end < begin) {
        [begin, end] = [end, begin];
    }
    const indexBegin = Math.ceil(timestampToIndex(begin, index));
    const indexEnd = Math.floor(timestampToIndex(end, index));

    let sum = 0;
    let len = 0;
    let max;

    for (let n = indexBegin; n <= indexEnd; ++n) {
        const k = (n + data.length) % data.length;
        const v = data[k];
        if (!Number.isNaN(v)) {
            if (max === undefined || v > max) {
                max = v;
            }
            sum = sum + v;
            ++len;
        }
    }
    return {
        average: sum / (len || 1),
        max,
        delta: end - begin,
    };
};

const Chart = ({ digitalChannelsEnabled = false }) => {
    const dispatch = useDispatch();
    const chartWindow = useCallback(
        (windowBegin, windowEnd, yMin, yMax) =>
            dispatch(
                chartWindowAction(
                    windowBegin,
                    windowEnd,
                    windowEnd - windowBegin,
                    yMin,
                    yMax
                )
            ),
        [dispatch]
    );
    const chartReset = useCallback(
        windowDuration =>
            dispatch(
                chartWindowAction(
                    null,
                    null,
                    windowDuration,
                    undefined,
                    undefined
                )
            ),
        [dispatch]
    );
    const chartCursor = useCallback(
        (cursorBegin, cursorEnd) =>
            dispatch(chartCursorAction(cursorBegin, cursorEnd)),
        [dispatch]
    );
    const {
        windowBegin,
        windowEnd,
        windowDuration,
        cursorBegin,
        cursorEnd,
        digitalChannels,
        digitalChannelsVisible,
        hasDigitalChannels,
    } = useSelector(chartState);
    const showDigitalChannels =
        digitalChannelsVisible && digitalChannelsEnabled;

    const { index } = options;

    const chartRef = useRef(null);

    const lineData = useLazyInitializedRef(emptyArray).current;
    const bitsData = useLazyInitializedRef(() =>
        [...Array(nbDigitalChannels)].map(() => emptyArray())
    ).current;
    const bitIndexes = useLazyInitializedRef(() => new Array(nbDigitalChannels))
        .current;
    const lastBits = useLazyInitializedRef(() => new Array(nbDigitalChannels))
        .current;

    const { data, bits } = options;

    let numberOfBits =
        windowDuration <= 3000000 && showDigitalChannels
            ? nbDigitalChannels
            : 0;
    if (!bits) {
        numberOfBits = 0;
    }

    const end = windowEnd || options.timestamp - options.samplingTime;
    const begin = windowBegin || end - windowDuration;

    const cursorData = {
        cursorBegin,
        cursorEnd,
        begin,
        end,
    };

    const [len, setLen] = useState(0);
    const [chartAreaWidth, setChartAreaWidth] = useState(0);

    const windowStats = calcStats(data, begin, end, index);
    const selectionStats = calcStats(data, cursorBegin, cursorEnd, index);

    const resetCursor = useCallback(() => chartCursor(null, null), [
        chartCursor,
    ]);

    const zoomPanCallback = useCallback(
        (beginX, endX, beginY, endY) => {
            if (typeof beginX === 'undefined') {
                chartReset(windowDuration);
                resetCursor();
                return;
            }

            const earliestDataTime =
                options.timestamp -
                (data.length / options.samplesPerSecond) * 1e6;

            const p0 = Math.max(0, earliestDataTime - beginX);
            const p1 = Math.max(0, endX - options.timestamp);

            if (p0 * p1 === 0) {
                chartWindow(beginX - p1 + p0, endX - p1 + p0, beginY, endY);
            }
        },
        [chartReset, chartWindow, data.length, windowDuration, resetCursor]
    );

    const zoomToWindow = useCallback(
        usec => {
            if (windowEnd) {
                const mid = (windowBegin + windowEnd) / 2;
                let a = mid - usec / 2;
                let b = mid + usec / 2;
                if (b > windowEnd) {
                    a = a - (b - windowEnd);
                    b = windowEnd;
                }
                chartWindow(a, b);
                return;
            }
            chartReset(usec);
        },
        [chartWindow, chartReset, windowBegin, windowEnd]
    );

    useEffect(() => {
        if (!chartRef.current.chartInstance) {
            return;
        }
        const { dragSelect, zoomPan } = chartRef.current.chartInstance;
        dragSelect.callback = chartCursor;
        zoomPan.callback = zoomPanCallback;
    }, [chartCursor, zoomPanCallback]);

    const chartResetToLive = () => zoomPanCallback(undefined, undefined);
    const chartPause = () =>
        chartWindow(options.timestamp - windowDuration, options.timestamp);

    const originalIndexBegin = timestampToIndex(begin, index);
    const originalIndexEnd = timestampToIndex(end, index);
    const step = (originalIndexEnd - originalIndexBegin) / len;

    let mappedIndex = 0;
    bitIndexes.fill(0);

    for (let i = 0; i < numberOfBits; ++i) {
        bitsData[i][0] = { x: undefined, y: undefined };
    }
    if (step > 1) {
        for (
            let originalIndex = originalIndexBegin;
            mappedIndex < len + len;
            ++mappedIndex, originalIndex = originalIndex + step
        ) {
            const timestamp =
                begin + windowDuration * (mappedIndex / (len + len));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + step);
            let min = Number.MAX_VALUE;
            let max = -Number.MAX_VALUE;
            for (let n = k; n < l; ++n) {
                const v = data[(n + data.length) % data.length];
                if (!Number.isNaN(v)) {
                    if (v > max) max = v;
                    if (v < min) min = v;
                }
            }

            if (min > max) {
                min = undefined;
                max = undefined;
            }
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = min;
            ++mappedIndex;
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = max;

            for (let i = 0; i < numberOfBits; ++i) {
                let y1;
                for (let n = k; n < l; ++n) {
                    const ni = (n + data.length) % data.length;
                    if (!Number.isNaN(data[ni])) {
                        const v = (((bits[ni] >> i) & 1) - 0.5) * 0.8;
                        if (y1 === undefined || v !== y1) {
                            if (
                                (bitsData[i][bitIndexes[i] - 1] || {}).y !==
                                    v ||
                                mappedIndex === len + len - 1
                            ) {
                                bitsData[i][bitIndexes[i]].x = timestamp;
                                bitsData[i][bitIndexes[i]].y = v;
                                ++bitIndexes[i];
                            }
                            if (y1 !== undefined) {
                                break;
                            }
                            y1 = v;
                        }
                    }
                }
            }
        }
    } else {
        lastBits.fill(undefined);
        let last;
        const originalIndexBeginFloored = Math.floor(originalIndexBegin);
        const originalIndexEndCeiled = Math.ceil(originalIndexEnd);
        for (
            let n = originalIndexBeginFloored;
            n <= originalIndexEndCeiled;
            ++mappedIndex, ++n
        ) {
            const k = (n + data.length) % data.length;
            const v = data[k];
            const timestamp =
                begin +
                ((n - originalIndexBegin) * 1e6) / options.samplesPerSecond;
            lineData[mappedIndex].x = timestamp;
            if (n < originalIndexEndCeiled) {
                last = Number.isNaN(v) ? undefined : v;
            }
            lineData[mappedIndex].y = last;

            for (let i = 0; i < numberOfBits; ++i) {
                const y = Number.isNaN(v)
                    ? undefined
                    : (((bits[k] >> i) & 1) - 0.5) * 0.8;
                bitsData[i][bitIndexes[i]].x = timestamp;
                if (n === originalIndexEndCeiled) {
                    bitsData[i][bitIndexes[i]].y = lastBits[i];
                    ++bitIndexes[i];
                } else if ((bitsData[i][bitIndexes[i] - 1] || {}).y !== y) {
                    bitsData[i][bitIndexes[i]].y = y;
                    lastBits[i] = y;
                    ++bitIndexes[i];
                }
            }
        }
    }

    const chartCursorActive = cursorBegin !== null || cursorEnd !== null;

    return (
        <div className="chart-outer">
            <div className="chart-current">
                <ChartTop
                    chartPause={chartPause}
                    chartResetToLive={chartResetToLive}
                    zoomToWindow={zoomToWindow}
                    chartRef={chartRef}
                />
                <TimeSpanTop width={chartAreaWidth + 1} />
                <ChartContainer
                    setLen={setLen}
                    setChartAreaWidth={setChartAreaWidth}
                    step={step}
                    chartRef={chartRef}
                    cursorData={cursorData}
                    lineData={lineData}
                    mappedIndex={mappedIndex}
                />
                <TimeSpanBottom
                    cursorBegin={cursorBegin}
                    cursorEnd={cursorEnd}
                    width={chartAreaWidth + 1}
                />
                <div
                    className="chart-bottom"
                    style={{ paddingRight: `${rightMargin}px` }}
                >
                    <StatBox {...windowStats} label="Window" />
                    <StatBox
                        {...selectionStats}
                        label="Selection"
                        action={
                            <Button
                                variant="secondary"
                                disabled={!chartCursorActive}
                                size="sm"
                                onClick={resetCursor}
                            >
                                CLEAR
                            </Button>
                        }
                    />
                </div>
            </div>
            {hasDigitalChannels && showDigitalChannels && (
                <DigitalChannels
                    bitsData={bitsData}
                    digitalChannels={digitalChannels}
                    bitIndexes={bitIndexes}
                    numberOfBits={numberOfBits}
                    cursorData={cursorData}
                />
            )}
        </div>
    );
};

Chart.propTypes = {
    digitalChannelsEnabled: bool,
};

export default Chart;
