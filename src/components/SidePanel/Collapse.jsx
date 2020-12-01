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

import React, { useContext, useEffect } from 'react';
import { string, node, bool, func } from 'prop-types';

import Accordion from 'react-bootstrap/Accordion';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionToggle } from 'react-bootstrap/AccordionToggle';

import './collapse.scss';

const ContextAwareToggle = ({ title, heading, eventKey, onToggled }) => {
    const currentEventKey = useContext(AccordionContext);
    const decoratedOnClick = useAccordionToggle(eventKey);
    const isCurrentEventKey = currentEventKey === eventKey;
    useEffect(() => onToggled(isCurrentEventKey), [
        isCurrentEventKey,
        onToggled,
    ]);

    return (
        <button
            type="button"
            onClick={decoratedOnClick}
            className={`collapse-toggle ${isCurrentEventKey ? 'show' : ''}`}
        >
            <h2 title={title}>{heading}</h2>
        </button>
    );
};
ContextAwareToggle.propTypes = {
    title: string,
    eventKey: string.isRequired,
    heading: string.isRequired,
    onToggled: func.isRequired,
};

const Collapse = ({
    heading,
    title,
    eventKey,
    className = '',
    children = null,
    defaultCollapsed = true,
    onToggled = () => {},
}) => (
    <Accordion defaultActiveKey={defaultCollapsed ? '' : eventKey}>
        <div className={`collapse-container ${className}`}>
            <ContextAwareToggle
                title={title}
                eventKey={eventKey}
                heading={heading}
                onToggled={onToggled}
            />
            <Accordion.Collapse eventKey={eventKey}>
                <>{children}</>
            </Accordion.Collapse>
        </div>
    </Accordion>
);

Collapse.propTypes = {
    heading: string.isRequired,
    title: string,
    eventKey: string.isRequired,
    className: string,
    children: node,
    defaultCollapsed: bool,
    onToggled: func,
};

export default Collapse;