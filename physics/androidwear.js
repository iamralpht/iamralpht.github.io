'use strict';

/*
Copyright 2014 Ralph Thomas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

//
// Android Wear back navigation demo. We create two "watches" and you can drag
// horizontally to back up. One uses a CSS transition with the same duration
// every time, the other uses an overdamped spring to incorporate the existing
// momentum from the drag.
//
function AndroidWearDemo(element) {
    this._element = element;
    this._element.classList.add('androidwear');

    function Watch(useCSS) {
        this._transitionDuration = 600;
        this._element = document.createElement('div');
        this._element.className = 'watch-container';
        var watch = document.createElement('div');
        watch.className = 'watch';
        this._element.appendChild(watch);
        // XXX: Work around a bug in Chrome; it doesn't render the second watch's
        //      wallpaper if the first watch has been opened. It's testing for
        //      layer occlusion without considering the "overflow: hidden" masking
        //      from a parent layer.
        watch.style.webkitTransform = 'translateZ(0)';
        watch.style.transform = 'translateZ(0)';
        this._useCSS = useCSS;

        this._menu = document.createElement('div');
        this._menu.className = 'menu';

        watch.appendChild(this._menu);

        addTouchOrMouseListener(this._menu, this);

        this._position = 0;
        this._startPosition = 0;

        //
        // Use a different simulation depending on whether we're really going back or not.
        //
        this._acceptSimulation = new Gravity(1000, 280);
        this._cancelSimulation = new Spring(1, 400, 40); // Critically damped cancellation spring.

        var self = this;
        var controls = new Controls();
        if (useCSS) {
            controls.addText('CSS Watch Transition');
            controls.addModel([
                {
                    label: 'Duration (ms)',
                    min: 30, max: 1000,
                    read: function() { return self._transitionDuration; },
                    write: function(val) { self._transitionDuration = val; }
                }]);
        } else {
            controls.addText('Physics Watch');
            var acceptConfig = this._acceptSimulation.configuration();
            acceptConfig[0].min = 1;
            acceptConfig[0].max = 5000;
            controls.addModel(acceptConfig, 'Accept Acceleration');
            controls.addModel(this._cancelSimulation, 'Cancel Spring');
        }
        controls.addResetButton(function() {
            if (self._animation) self._animation.cancel();
            self._position = 0;
            self._startPosition = 0;
            self._menu.style.transition = 'none';
            self._menu.style.webkitTransform = 'translateX(0) translateZ(0)';
            self._menu.style.transform = 'translateX(0) translateZ(0)';
        });
        this._element.appendChild(controls.element());
    }
    Watch.prototype.element = function() { return this._element; }
    Watch.prototype.onTouchStart = function() {
        if (this._animation) this._animation.cancel();
        // In CSS mode we should read back from the DOM here, something like:
        //  this._position = new WebKitCSSMatrix(window.getComputedStyle(this._menu).transform).e;
        // But I want these examples to work in Firefox which doesn't have any
        // CSSMatrix implementation (and I don't want to bring in a polyfill),
        // so we're going to live with discontinuous dragging in CSS mode.
        this._startPosition = this._position;
        // Disable transitions while we're dragging. We don't want the browser
        // to animate from the old transform to the new one while our finger
        // is on the menu; we need it to snap there.
        this._menu.style.transition = 'none';
    }
    Watch.prototype.onTouchMove = function(dx) {
        this._position = this._startPosition + dx;
        // If the finger is dragging the menu in a direction it won't go then
        // make the movement less effective.
        if (this._position < 0) this._position /= 3;

        var transform = 'translateX(' + this._position + 'px) translateZ(0)';
        this._menu.style.webkitTransform = transform;
        this._menu.style.transform = transform;
    }
    Watch.prototype.onTouchEnd = function(dx, dy, velocity) {
        var end = 0;
        // Determine if the velocity and position were enough to back out.
        // Android Wear just tests if the x position was over a threshold,
        // they don't seem to examine velocity, so small flicks are ineffective
        // unless you happen to make it over the threshold.
        if ((dx > 240 / 2 && velocity.x >= 0) || velocity.x > 200) end = 240;

        if (this._useCSS) {
            this._position = end;
            var transform = 'translateX(' + this._position + 'px) translateZ(0)';
            this._menu.style.webkitTransition = '-webkit-transform ' + this._transitionDuration + 'ms';
            this._menu.style.transition = 'transform ' + this._transitionDuration + 'ms';
            this._menu.style.webkitTransform = transform;
            this._menu.style.transform = transform;
            return;
        }
        // If it was a cancel then use the cancel spring, otherwise use the
        // accept spring.
        if (end > 0) {
            var vel = velocity.x;
            this._acceptSimulation.set(this._position, velocity.x);
            this._animation = animation(this._acceptSimulation, this._update.bind(this, 1, this._acceptSimulation));
        }
        else {
            // Use the spring instead; snap it to our current
            // position then set the end point with our x velocity.
            // We keep the spring moving between 1 and 0 (or -1 and 0) since that's
            // consistent with how springs are used in all of the other examples;
            // you can use whatever unit system you like, though.
            this._cancelSimulation.snap(this._position / 240);
            this._cancelSimulation.setEnd(0, velocity.x / 240);
            this._animation = animation(this._cancelSimulation, this._update.bind(this, 240, this._cancelSimulation));
        }

    }
    Watch.prototype._update = function(multiplier, model) {
        this._position = model.x() * multiplier;
        var transform = 'translateX(' +  this._position + 'px) translateZ(0)';
        this._menu.style.webkitTransform = transform;
        this._menu.style.transform = transform;
    }

    var cssWatch = new Watch(true);
    var springWatch = new Watch(false);

    this._element.appendChild(cssWatch.element());
    this._element.appendChild(springWatch.element());
}
window.addEventListener('load', function() { new AndroidWearDemo(document.getElementById('androidWearExample')); }, false);
