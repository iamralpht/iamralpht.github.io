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

function ConstantVelocity(v) {
    this._v = v;
    this._position = 0;
    this._startTime = 0;
}
ConstantVelocity.prototype.start = function() {
    this._startTime = (new Date()).getTime();
}
ConstantVelocity.prototype.stop = function() {
    this._position = this.x();
    this._startTime = 0;
}
ConstantVelocity.prototype.x = function() {
    if (this._startTime == 0) return this._position;
    var delta = ((new Date()).getTime() - this._startTime) / 1000.0;
    return this._position - delta * this._v;
}
ConstantVelocity.prototype.dx = function() { return this._v; }
ConstantVelocity.prototype.done = function() { return false; }
ConstantVelocity.prototype.configuration = function() {
    var self = this;
    function setVelocity(v) {
        self.stop();
        self._v = v;
        self.start();
    }
    return [
        {
            label: 'Constant Velocity',
            read:  this.dx.bind(this),
            write: setVelocity,
            min:   1,
            max:   300,
        }
    ];
}

// iTunes Radio demo. We have two simulations running; one is just simulating
// constant velocity, so the value increases or decreases by the same amount
// every second, forever. We kill the constant velocity simulation when the
// user puts thier finger down and starts dragging the content.
// The other simulation is a gesture controlled friction
// simulation.
function iTunesRadioDemo(element) {
    function makeStack(image, labelContent) {
        var stack = document.createElement('div');
        stack.className = 'stack';
        for (var i = 4; i >= 0; i--) {
            var cover = document.createElement('div');
            cover.className = 'cover cover-' + i;
            // iTunes radio looks suspiciously like it uses the same image for
            // all covers and just moves them around to make the borders look
            // unique. An excellent strategy!
            cover.style.backgroundImage = 'url(' + image + ')';

            stack.appendChild(cover);
            // Translate the cover backwards in Z so that the perspective effect
            // works.
            var transform = 'translateZ(' + (i * -50) + 'px)';
            cover.style.webkitTransform = transform;
            cover.style.transform = transform;

            // Add a dimming layer to non-frontmost covers, simulating a constant
            // fog.
            if (i == 0) break;
            var fog = document.createElement('div');
            fog.className = 'fog';
            fog.style.opacity = 0.15 * i;
            cover.appendChild(fog);
        }
        var label = document.createElement('div');
        label.className = 'stack-label';
        label.innerHTML = labelContent;
        stack.appendChild(label);

        return stack;
    }

    this._scroller = document.createElement('div');
    this._scroller.className = 'itunes-scroll';
    // We want enough stacks to fill a wide screen. 20 should do it.
    var model = [
        { url: 'albums/radiohead.jpg', band: 'Radiohead' },
        { url: 'albums/abbey-road.jpg', band: 'The Beatles' },
        { url: 'albums/1984.jpg', band: 'Van Halen' },
        { url: 'albums/thom-yorke.jpg', band: 'Thom Yorke' },
        { url: 'albums/agaetis-byrjun.jpg', band: 'Sigur Ros' },
        { url: 'albums/unknown-pleasures.jpg', band: 'Joy Division' },
        { url: 'albums/hot-chip.jpg', band: 'Hot Chip' },
        { url: 'albums/cross.jpg', band: 'Justice' },
        { url: 'albums/massive-attack.jpg', band: 'Massive Attack' },
        { url: 'albums/the-xx.jpg', band: 'The xx' }
    ];
    this._stacks = [];
    for (var i = 0; i < 20; i++) {
        var m = model[i % model.length];
        var s = makeStack(m.url, '<b>' + m.band + '</b> Radio');
        this._scroller.appendChild(s);
        this._stacks.push(s);
    }
    this._layout(0);
    element.classList.add('itunesradiodemo');
    element.appendChild(this._scroller);

    // Register for events so that we can pan and start our friction animation.
    addTouchOrMouseListener(this._scroller, this);

    // This is the offset coming from friction.
    this._frictionOffset = 0;
    this._startOffset = 0;
    this._friction = new Friction(0.001);

    // This is our simple simulation of constant velocity. It just multiplies a time
    // delta by the velocity.
    this._constantVelocity = new ConstantVelocity(80);
    this._constantVelocity.start();
    // We just leave this animation running all the time. It will also read the offset
    // value from the friction animation.
    animation(this._constantVelocity, this._update.bind(this));

    // Add some controls to twiddle with the settings.
    var controls = new Controls();
    controls.addModel(this._constantVelocity);
    controls.addModel(this._friction);
    element.appendChild(controls.element());

}
iTunesRadioDemo.prototype._layout = function(x) {

    var STACK_WIDTH = 128;
    var PADDING = 10;
    var STACK_SIZE = STACK_WIDTH + PADDING;

    var WINDOW_WIDTH = STACK_SIZE * this._stacks.length;

    while (x > 0) {
        x -= WINDOW_WIDTH;
    }

    for (var i = 0; i < this._stacks.length; i++) {
        var xp = x + STACK_SIZE * i;
        // Wrap the covers to the window
        xp = xp % WINDOW_WIDTH;
        // If the cover moves off the edge of the screen then
        // push it back around to the other side.
        if (xp < -(STACK_SIZE * 2)) {
            xp += this._stacks.length * STACK_SIZE;
        }

        var s = this._stacks[i];
        var transform = 'translateX(' + xp + 'px)';
        s.style.webkitTransform = transform;
        s.style.transform = transform;
    }
}
iTunesRadioDemo.prototype._update = function() {
    // Update the friction offset if we have a model.
    if (this._friction && !this._friction.done()) {
        this._frictionOffset = this._friction.x();
    }
    this._layout(this._constantVelocity.x() + this._frictionOffset);
}
iTunesRadioDemo.prototype.onTouchStart = function() {
    // The finger is down; stop the constant velocity animation.
    this._friction.set(this._frictionOffset, 0);
    this._constantVelocity.stop();
    this._startOffset = this._frictionOffset;
}
iTunesRadioDemo.prototype.onTouchMove = function(dx) {
    this._frictionOffset = this._startOffset + dx;
    this._update();
}
iTunesRadioDemo.prototype.onTouchEnd = function(dx, dy, velocity) {
    // The finger is up; restart the constant velocity animation
    this._constantVelocity.start();
    // This is interesting: because we have the constant velocity we need to adjust
    // the velocity incoming from the touch.
    var vx = velocity.x - this._constantVelocity.dx();
    this._friction.set(this._frictionOffset, vx);

}
window.addEventListener('load', function() { new iTunesRadioDemo(document.getElementById('iTunesRadioExample')); }, false);
