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
 * Friction physics simulation. Friction is actually just a simple
 * power curve; the only trick is taking the natural log of the
 * initial drag so that we can express the answer in terms of time.
 */
function Friction(drag) {
    this._drag = drag;
    this._dragLog = Math.log(drag);
    this._x = 0;
    this._v = 0;
    this._startTime = 0;
}
Friction.prototype.set = function(x, v) {
    this._x = x;
    this._v = v;
    this._startTime = (new Date()).getTime();
}
Friction.prototype.x = function(dt) {
    if (dt == undefined) dt = ((new Date()).getTime() - this._startTime) / 1000;
    return this._x + this._v * Math.pow(this._drag, dt) / this._dragLog - this._v / this._dragLog;
}
Friction.prototype.dx = function() {
    var dt = ((new Date()).getTime() - this._startTime) / 1000;
    return this._v * Math.pow(this._drag, dt);
}
Friction.prototype.done = function() {
    return Math.abs(this.dx()) < 1;
}
Friction.prototype.reconfigure = function(drag) {
    var x = this.x();
    var v = this.dx();
    this._drag = drag;
    this._dragLog = Math.log(drag);
    this.set(x, v);
}
Friction.prototype.configuration = function() {
    var self = this;
    return [
        {
            label: 'Friction',
            read: function() { return self._drag; },
            write: function(drag) { self.reconfigure(drag); },
            min: 0.001,
            max: 0.1,
            step: 0.001
        }
    ];
}
