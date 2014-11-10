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
        this._transitionDuration = 200;
        this._element = document.createElement('div');
        this._element.className = 'watch-container';
        var watch = document.createElement('div');
        watch.className = 'watch';
        this._element.appendChild(watch);
        // XXX: Work around a bug in Chrome; it doesn't render the second watch's
        //      wallpaper if the first watch has been opened.
        watch.style.webkitTransform = 'translateZ(0)';
        watch.style.transform = 'translateZ(0)';
        this._useCSS = useCSS;

        this._menu = document.createElement('div');
        this._menu.className = 'menu';

        watch.appendChild(this._menu);

        addTouchOrMouseListener(this._menu, this);

        this._position = 0;
        this._startPosition = 0;

        this._spring = new Spring(1, 200, 60);

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
            controls.addModel(this._spring, 'Physics Watch Spring');
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
        // XXX: Add some controls to reset the menu once you've
        //      dismissed it.
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
        // I can't remember what Android wear actually does here. It always
        // backs out if you're past half way, but I've forgotten the details
        // of how it incorporates touch velocity. It does have some odd snaps
        // around cancellation of going back, however.
        // Better would be to use an equation like escape velocity.
        if (dx > 240 / 2 || velocity.x > 500) end = 240;

        if (this._useCSS) {
            this._position = end;
            var transform = 'translateX(' + this._position + 'px) translateZ(0)';
            this._menu.style.transition = 'transform ' + this._transitionDuration + 'ms';
            this._menu.style.webkitTransform = transform;
            this._menu.style.transform = transform;
            return;
        }
        // Use the spring instead; snap it to our current
        // position then set the end point with our x velocity.
        this._spring.snap(this._position / 240);
        // What's going on here -- why am I multiplying the end position by 2?
        // I want the screen to accelerate away which maps nicely to the first
        // half of the spring curve.
        this._spring.setEnd(end / 120, velocity.x / 240);

        this._animation = animation(this._spring, this._update.bind(this));
    }
    Watch.prototype._update = function() {
        this._position = this._spring.x() * 240;
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
