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
// Windows 8 lock screen demo. We use a vertically draggable image. When released
// it falls to the ground and bounces, using the GravityWithBounce simulation.
//
function Windows8LockScreenDemo(element) {
    this._element = element;
    this._element.classList.add('w8-lock');

    this._screen = document.createElement('div');
    this._screen.className = 'screen';
    this._element.appendChild(this._screen);

    this._desktop = document.createElement('div');
    this._desktop.className = 'desktop';
    this._screen.appendChild(this._desktop);

    this._lock = document.createElement('div');
    this._lock.className = 'lock';
    this._screen.appendChild(this._lock);

    // Create our gravity simulation. We use a gravitational acceleration of roughly 9.8m/s
    // (assuming 100dpi and 40 inches in a metre).
    this._gravity = new GravityWithBounce(9.8 * 200, 0.4);

    // Remember the position of the lock screen so that when the finger goes down we can
    // translate from here.
    this._position = 0;
    this._startPosition = 0;

    addTouchOrMouseListener(this._lock, this);

    var self = this;
    var controls = new Controls();
    controls.addModel(this._gravity, 'Lock Screen Gravity');
    controls.addResetButton(function() {
        if (self._animation) self._animation.cancel();
        self._position = 0;
        self._startPosition = 0;
        var transform = 'translateY(0px) translateZ(0)';
        self._lock.style.transform = transform;
    });
    this._element.appendChild(controls.element());
}
Windows8LockScreenDemo.prototype.onTouchStart = function() {
    // Stop any animation we might have running. Now the finger is in control!
    if (this._animation) this._animation.cancel();

    this._startPosition = this._position;
}
Windows8LockScreenDemo.prototype.onTouchMove = function(dx, dy) {
    this._position = this._startPosition + dy;
    // Notice that we don't slip here; we don't mutate the start position so you have to drag back
    // to where you started before the lock screen will move up again. Android tends to be very
    // liberal with slip, and it irritates me because I feel like energy is being eliminated. *Better*
    // would be if we squished the lock screen a bit, or deformed it around the finger to indicate
    // that the touch is still being recognized (and the machine is still responding) but that the
    // lock screen can't move to that position...).
    if (this._position > 0) this._position = 0;
    var transform = 'translateY(' + this._position + 'px) translateZ(0)';
    this._lock.style.transform = transform;
}
Windows8LockScreenDemo.prototype.onTouchEnd = function(dx, dy, velocity) {
    this._position = this._startPosition + dy;
    if (this._position > 0) this._position = 0;
    if (dy > 0) dy = 0;
    // Ok, feed the position and velocity into our gravity simulation and start updating the DOM
    // every frame.
    this._gravity.set(dy, velocity.y);
    this._animation = animation(this._gravity, this._update.bind(this));
}
Windows8LockScreenDemo.prototype._update = function() {
    this._position = this._gravity.x();
    var transform = 'translateY(' + this._position + 'px) translateZ(0)';
    this._lock.style.transform = transform;
}

window.addEventListener('load', function() { new Windows8LockScreenDemo(document.getElementById('lockScreenExample')); }, false);
