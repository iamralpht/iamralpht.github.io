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
 * Fall with Soft Landing simulation. This is an example of combining simulations
 * to create something new. Here we're combining gravity with a spring: the value
 * falls under gravity, and when it passes a certain point its momentum is rolled
 * into a spring which supports it.
 *
 * The way that we transition between the two simulations is pretty weak: on the
 * frame that we go through the ground we switch to using the spring. In practice
 * this looks fine, but if we dropped a lot of frames then we could end up with
 * an enormous velocity from gravity before we switched to the spring. It would
 * be better to compute when the gravity reaches the ground and then switch based
 * on that specific time. In the case of gravity that's an easily solvable
 * equation, but things can get complicated computing the time when a spring
 * reaches a certain position, so I'm showing the (cheesy but) generic method
 * here.
 */
function Fall(ground, gravity, springC, springD) {
    gravity = gravity || 5000;
    springC = springC || 180;
    springD = springD || 20;
    this._ground = ground;
    this._gravity = new Gravity(gravity, 1000);
    this._spring = new Spring(1, springC, springD);
    this._springing = false;
}
Fall.prototype.set = function(x, v) {
    this._gravity.set(x, v);
    if (x >= this._ground) {
        this._springing = true;
        this._spring.snap(x);
        this._spring.setEnd(this._ground);
    } else {
        this._springing = false;
    }
}
Fall.prototype.x = function() {
    // Use the spring if we already hit the ground.
    if (this._springing) {
        return this._spring.x();
    }
    // Otherwise use gravity...
    var x = this._gravity.x();
    // Did we go through the ground?
    if (x >= this._ground) {
        // Yeah, switch to using the spring.
        this._springing = true;
        this._spring.snap(this._ground);
        // Start the spring at the current position (the ground) but with all of the
        // velocity from the gravity simulation. Because we use the same mass of "1" for
        // everything, the velocity and momentum are equivalent.
        this._spring.setEnd(this._ground, this._gravity.dx());
        x = this._spring.x();
    }
    return x;
}
Fall.prototype.dx = function() {
    if (this._springing) return this._spring.dx();
    return this._gravity.dx();
}
Fall.prototype.done = function() {
    if (this._springing) return this._spring.done();
    return this._gravity.done();
}
Fall.prototype.configuration = function() {
    var config = this._gravity.configuration();
    config[0].min = 1;
    config[0].max = 6000;
    config.push.apply(config, this._spring.configuration());
    return config;
}
