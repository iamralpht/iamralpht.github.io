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

var epsilon = 0.001;
function almostEqual(a, b, epsilon) { return (a > (b - epsilon)) && (a < (b + epsilon)); }
function almostZero(a, epsilon) { return almostEqual(a, 0, epsilon); }

/***
 * Simple Spring implementation -- this implements a damped spring using a symbolic integration
 * of Hooke's law: F = -kx - cv. This solution is significantly more performant and less code than
 * a numerical approach such as Facebook Rebound which uses RK4.
 *
 * This physics textbook explains the model:
 *  http://www.stewartcalculus.com/data/CALCULUS%20Concepts%20and%20Contexts/upfiles/3c3-AppsOf2ndOrders_Stu.pdf
 */
function Spring(mass, springConstant, damping) {
    this._m = mass;
    this._k = springConstant;
    this._c = damping;
    this._solution = null;
    this._endPosition = 0;
    this._startTime = 0;
}
Spring.prototype._solve = function(initial, velocity) {
    var c = this._c;
    var m = this._m;
    var k = this._k;
    // Solve the quadratic equation; root = (-c +/- sqrt(c^2 - 4mk)) / 2m.
    var cmk = c * c - 4 * m * k;
    if (cmk == 0) {
        // The spring is critically damped.
        // x = (c1 + c2*t) * e ^(-c/2m)*t
        var r = -c / (2 * m);
        var c1 = initial;
        var c2 = velocity / (r * initial);
        return {
            x: function(t) { return (c1 + c2 * t) * Math.pow(Math.E, r * t); },
            dx: function(t) { var pow = Math.pow(Math.E, r * t); return r * (c1 + c2 * t) * pow + c2 * pow; }
        };
    } else if (cmk > 0) {
        // The spring is overdamped; no bounces.
        // x = c1*e^(r1*t) + c2*e^(r2t)
        // Need to find r1 and r2, the roots, then solve c1 and c2.
        var r1 = (-c - Math.sqrt(cmk)) / (2 * m);
        var r2 = (-c + Math.sqrt(cmk)) / (2 * m);
        var c2 = (velocity - r1 * initial) / (r2 - r1);
        var c1 = initial - c2;

        return {
            x: function(t) { return (c1 * Math.pow(Math.E, r1 * t) + c2 * Math.pow(Math.E, r2 * t)); },
            dx: function(t) { return (c1 * r1 * Math.pow(Math.E, r1 * t) + c2 * r2 * Math.pow(Math.E, r2 * t)); }
            };
    } else {
        // The spring is underdamped, it has imaginary roots.
        // r = -(c / 2*m) +- w*i
        // w = sqrt(4mk - c^2) / 2m
        // x = (e^-(c/2m)t) * (c1 * cos(wt) + c2 * sin(wt))
        var w = Math.sqrt(4*m*k - c*c) / (2 * m);
        var r = -(c / 2*m);
        var c1= initial;
        var c2= (velocity - r * initial) / w;
            
        return {
            x: function(t) { return Math.pow(Math.E, r * t) * (c1 * Math.cos(w * t) + c2 * Math.sin(w * t)); },
            dx: function(t) {
                var power =  Math.pow(Math.E, r * t);
                var cos = Math.cos(w * t);
                var sin = Math.sin(w * t);
                return power * (c2 * w * cos - c1 * w * sin) + r * power * (c2 * sin + c1 * cos);
            }
        };
    }
}
Spring.prototype.x = function(t) {
    if (!t) t = (new Date()).getTime();
    return this._solution ? this._endPosition + this._solution.x((t - this._startTime) / 1000.0) : 0;
}
Spring.prototype.dx = function(t) {
    if (!t) t = (new Date()).getTime();
    return this._solution ? this._solution.dx((t - this._startTime) / 1000.0) : 0;
}
Spring.prototype.setEnd = function(x, velocity, t) {
    if (!t) t = (new Date()).getTime();
    if (x == this._endPosition) return;
    velocity = velocity || 0;
    var position = this._endPosition;
    if (this._solution) {
        // Don't whack incoming velocity.
        if (almostZero(velocity, epsilon))
            velocity = this._solution.dx((t - this._startTime) / 1000.0);
        position = this._solution.x((t - this._startTime) / 1000.0);
        if (almostZero(velocity, epsilon)) velocity = 0;
        if (almostZero(position, epsilon)) position = 0;
        position += this._endPosition;
    }
    if (this._solution && almostZero(position - x, epsilon) && almostZero(velocity, epsilon))
        return;
    this._endPosition = x;
    this._solution = this._solve(position - this._endPosition, velocity);
    this._startTime = t;
}
Spring.prototype.snap = function(x) {
    this._startTime = (new Date()).getTime();
    this._endPosition = x;
    this._solution = {
        x: function() { return 0; },
        dx: function() { return 0; }
    };
}
Spring.prototype.done = function(t) {
    if (!t) t = (new Date()).getTime();
    return almostEqual(this.x(), this._endPosition, epsilon) && almostZero(this.dx(), epsilon);
}
Spring.prototype.reconfigure = function(mass, springConstant, damping) {
    this._m = mass;
    this._k = springConstant;
    this._c = damping;

    if (this.done()) return;
    this._solution = this._solve(this.x() - this._endPosition, this.dx());
    this._startTime = (new Date()).getTime();
}
Spring.prototype.springConstant = function() { return this._k; }
Spring.prototype.damping = function() { return this._c; }

Spring.prototype.configuration = function() {
    function setSpringConstant(s, c) { s.reconfigure(1, c, s.damping()); };
    function setSpringDamping(s, d) { s.reconfigure(1, s.springConstant(), d); }
    return [
        { label: 'Spring Constant', read: this.springConstant.bind(this), write: setSpringConstant.bind(this, this), min: 100, max: 1000 },
        { label: 'Damping', read: this.damping.bind(this), write: setSpringDamping.bind(this, this), min: 1, max: 500 }
    ];
}
