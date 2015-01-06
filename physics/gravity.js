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
 * Gravity physics simulation. This actually just simulates
 * Newton's second law, F=ma integrated to x' = x + v*t + 0.5*a*t*t.
 *
 * Note that gravity is never done, so we pass in an explicit termination point beyond which we
 * declare ourselves "done".
 */
function Gravity(acceleration, terminate) {
    this._acceleration = acceleration;
    this._terminate = terminate;

    this._x = 0;
    this._v = 0;
    this._a = acceleration;
    this._startTime = 0;
}
Gravity.prototype.set = function(x, v) {
    this._x = x;
    this._v = v;
    this._startTime = (new Date()).getTime();
}
Gravity.prototype.x = function(dt) {
    var t = (new Date()).getTime();
    if (dt == undefined) dt = (t - this._startTime) / 1000.0;
    return this._x + this._v * dt + 0.5 * this._a * dt * dt;
}
Gravity.prototype.dx = function() {
    var t = (new Date()).getTime();
    var dt = (t - this._startTime) / 1000.0;

    return this._v + dt * this._a;
}
Gravity.prototype.done = function() {
    return Math.abs(this.x()) > this._terminate;
}
Gravity.prototype.reconfigure = function(a) {
    this.set(this.x(), this.dx());
    this._a = a;
}
Gravity.prototype.configuration = function() {
    var self = this;
    return [
        { label: 'Acceleration', read: function() { return self._a; }, write: this.reconfigure.bind(this), min: -3000, max: 3000 }
    ];
}

/**
 * This is an adaptation of Gravity to have a "floor" at 0. When the object hits
 * the floor its velocity is inverted so that it bounces.
 */
function GravityWithBounce(acceleration, absorb) {
    this._gravity = new Gravity(acceleration, 0);
    this._absorb = absorb || 0.8;
    this._reboundedLast = false;
}
GravityWithBounce.prototype.set = function(x, v) { this._gravity.set(x, v); }
GravityWithBounce.prototype.x = function() {
    var x = this._gravity.x();
    // If x goes past zero then we're travelling under the floor, so invert
    // the velocity.
    // The end condition here is hacky; if we rebound two frames in a row then
    // we decide we're done. Don't skip too many frames!
    if (x > 0) {
        if (this._reboundedLast) return 0;
        this._reboundedLast = true;
        var v = this._gravity.dx();
        if (Math.abs(v * this._absorb) > Math.abs(this._gravity._a * 2) / 60)
            this._gravity.set(0, -v * this._absorb);
        return 0;
    }
    this._reboundedLast = false;
    return x;
}
GravityWithBounce.prototype.dx = function() { return this._gravity.dx(); }
GravityWithBounce.prototype.done = function() {
    return this._gravity.x() > 1;
}
GravityWithBounce.prototype.reconfigure = function(a, absorb) {
    this._gravity.reconfigure(a);
    this._absorb = absorb || 0.8;
}
GravityWithBounce.prototype.configuration = function() {
    var self = this;
    var conf = this._gravity.configuration();
    conf.push({
        label: 'Rebound',
        read: function() { return self._absorb; },
        write: function(val) { self._absorb = val; },
        min: 0,
        max: 1.1,
        step: 0.1
    });
    return conf;
}
