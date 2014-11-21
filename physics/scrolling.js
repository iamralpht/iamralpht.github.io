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

/***
 * Scroll combines Friction and Spring to provide the
 * classic "flick-with-bounce" behavior.
 */
function Scroll(extent) {
    this._extent = extent;
    this._friction = new Friction(0.01);
    this._spring = new Spring(1, 90, 20);
    this._startTime = 0;
    this._springing = false;
    this._springOffset = 0;
}
Scroll.prototype.set = function(x, v) {
    this._friction.set(x, v);

    // If we're over the extent or zero then start springing. Notice that we also consult
    // velocity because we don't want flicks that start in the overscroll to get consumed
    // by the spring.
    if (x > 0 && v >= 0) {
        this._springOffset = 0;
        this._springing = true;
        this._spring.snap(x);
        this._spring.setEnd(0);
    } else if (x < -this._extent && v <= 0) {
        this._springOffset = 0;
        this._springing = true;
        this._spring.snap(x);
        this._spring.setEnd(-this._extent);
    } else {
        this._springing = false;
    }
    this._startTime = (new Date()).getTime();
}
Scroll.prototype.x = function(t) {
    if (!this._startTime) return 0;
    if (!t) t = ((new Date()).getTime() - this._startTime) / 1000.0;
    // We've entered the spring, use the value from there.
    if (this._springing) return this._spring.x() + this._springOffset;
    // We're still in friction.
    var x = this._friction.x(t);
    var dx = this.dx(t);
    // If we've gone over the edge the roll the momentum into the spring.
    if ((x > 0 && dx >= 0) || (x < -this._extent && dx <= 0)) {
        this._springing = true;
        this._spring.setEnd(0, dx);
        if (x < -this._extent) this._springOffset = -this._extent;
        else this._springOffset = 0;
        x = this._spring.x() + this._springOffset;
    }
    return x;
}
Scroll.prototype.dx = function(t) {
    if (this._springing) return this._spring.dx(t);
    return this._friction.dx(t);
}
Scroll.prototype.done = function() {
    if (this._springing) return this._spring.done();
    else return this._friction.done();
}
Scroll.prototype.configuration = function() {
    var config = this._friction.configuration();
    config.push.apply(config, this._spring.configuration());
    return config;
}

var UNDERSCROLL_TRACKING = 0.5;

function ScrollHandler(element) {
    this._element = element;
    this._position = 0;
    this._extent = this._element.offsetHeight - this._element.parentElement.offsetHeight;
    this._scroll = new Scroll(this._extent);
}
ScrollHandler.prototype.onTouchStart = function() {
    this._startPosition = this._position;

    // Ensure that we don't jump discontinuously when applying the underscroll
    // tracking in onTouchMove if the view is currently outside of the valid
    // scroll constraints.
    if (this._startPosition > 0)
        this._startPosition /= UNDERSCROLL_TRACKING;
    else if (this._startPosition < -this._extent)
        this._startPosition = (this._startPosition + this._extent) / UNDERSCROLL_TRACKING - this._extent;

    if (this._animation) this._animation.cancel();

    var pos = this._position;
    var transform = 'translateY(' + pos + 'px)';
    this._element.style.webkitTransform = transform;
    this._element.style.transform = transform;
}
ScrollHandler.prototype.onTouchMove = function(dx, dy) {
    var pos = dy + this._startPosition;
    if (pos > 0) pos *= UNDERSCROLL_TRACKING;
    else if (pos < -this._extent) pos = (pos + this._extent) * UNDERSCROLL_TRACKING - this._extent;

    this._position = pos;
    var transform = 'translateY(' + pos + 'px) translateZ(0)';
    this._element.style.webkitTransform = transform;
    this._element.style.transform = transform;
}
ScrollHandler.prototype.onTouchEnd = function(dx, dy, velocity) {
    var self = this;
    this._scroll.set(this._position, velocity.y);
    this._animation = animation(this._scroll, function() {
        var pos = self._scroll.x();
        self._position = pos;
        // The translateZ is to help older WebKits not collapse this layer into a non-composited layer
        // since they're also slow at repaints.
        var transform = 'translateY(' + pos + 'px) translateZ(0)';
        self._element.style.webkitTransform = transform;
        self._element.style.transform = transform;
    });
}
ScrollHandler.prototype.configuration = function() {
    return this._scroll.configuration();
}
