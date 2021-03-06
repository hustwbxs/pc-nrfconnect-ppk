/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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

import reducer, * as triggerActions from '../triggerReducer';

const initialState = reducer(undefined, {});

describe('triggerReducer', () => {
    describe('modify attributes', () => {
        it('should set trigger level', () => {
            const state = reducer(initialState, {
                type: triggerActions.TRIGGER_LEVEL_SET,
                triggerLevel: 5,
            });
            expect(state.triggerLevel).toEqual(5);
        });

        it('should set trigger length', () => {
            const state = reducer(initialState, {
                type: triggerActions.TRIGGER_LENGTH_SET,
                triggerLength: 37.85,
            });
            expect(state.triggerLength).toEqual(37.85);
        });

        it('should set window ranges', () => {
            const state = reducer(initialState, {
                type: triggerActions.TRIGGER_WINDOW_RANGE,
                triggerWindowRange: {
                    min: 5,
                    max: 50,
                },
            });
            expect(state.triggerWindowRange.min).toEqual(5);
            expect(state.triggerWindowRange.max).toEqual(50);
        });
    });

    describe('trigger single set', () => {
        const waitingState = reducer(initialState, {
            type: triggerActions.TRIGGER_SINGLE_SET,
        });

        it('should start trigger', () => {
            expect(waitingState.triggerSingleWaiting).toBe(true);
            expect(waitingState.triggerRunning).toBe(false);
        });

        it('should clear trigger', () => {
            const clearedState = reducer(waitingState, {
                type: triggerActions.TRIGGER_SINGLE_CLEAR,
            });
            expect(clearedState.triggerSingleWaiting).toBe(false);
        });
    });
});
