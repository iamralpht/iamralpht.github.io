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
// Button demo. Create two buttons, one will use CSS transitions to shrink when pressed, the other
// will use an (initially) underdamped spring.
//
function ButtonDemo(element) {
    this._element = element;
    this._element.classList.add('buttondemo');

    // Create our CSS button. All of the animation on this button is declared in button.css using the
    // :active pseudoselector as the trigger.
    var col = document.createElement('div');
    col.className = 'button-column';

    var cssButton = document.createElement('div');
    cssButton.className = 'button css-button';
    cssButton.textContent = 'CSS Button';

    col.appendChild(cssButton);
    // Allow control of the CSS transition duration.
    var transitionDuration = 200;
    var controls = new Controls();
    controls.addText('CSS Transition');
    controls.addModel([
        {
            label: 'Duration (ms)',
            min: 30, max: 1000,
            read: function() { return transitionDuration; },
            write: function(dur) {
                transitionDuration = dur;
                cssButton.style.webkitTransitionDuration = dur + 'ms';
                cssButton.style.transitionDuration = dur + 'ms';
            }
        }
    ]);
    col.appendChild(controls.element());

    this._element.appendChild(col);

    // Create the spring that will control the scale of the spring button. 400 is the spring constant
    // and 20 is the damping. This will be an underdamped spring.
    this._spring = new Spring(1, 400, 20);
    // Snap the spring's end-point to 1. This is where we want it to start and it corresponds to a
    // full scale button.
    this._spring.snap(1);

    col = document.createElement('div');
    col.className = 'button-column';
    // Create the spring button.
    this._springButton = document.createElement('div');
    this._springButton.className = 'button spring-button';
    this._springButton.textContent = 'Spring Button';

    col.appendChild(this._springButton);
    this._element.appendChild(col);

    // Listen for touch/mouse events on the spring button. We'll get called back on our onTouchXYZ
    // methods.
    addTouchOrMouseListener(this._springButton, this);

    // Add some controls so that the user can play with the spring values.
    controls = new Controls();
    controls.addModel(this._spring, 'Button Spring Controls');
    col.appendChild(controls.element());
}
ButtonDemo.prototype.onTouchStart = function() {
    // Set the end-point of the spring to 0. This means the spring will start moving toward that
    // point in a motion controlled by its current momentum and the parameters (400 and 20) we
    // constructed the spring with.
    //
    // The spring can only accumulate momentum by having its end-point toggled rhythmically, since
    // we're not using touch velocity or anything like that.
    this._spring.setEnd(0);

    // We updated the spring, we need to do something every frame to copy the value of the spring
    // out to the DOM. The `animate` function calls us every frame so long as the physics model
    // is still moving.

    if (this._animation) this._animation.cancel();
    this._animation = animation(this._spring, this._update.bind(this));
}
ButtonDemo.prototype.onTouchEnd = function(dx, dy, velocity) {
    // Change the end-point of the spring back to 1.
    this._spring.setEnd(1);

    if (this._animation) this._animation.cancel();
    this._animation = animation(this._spring, this._update.bind(this));
}
ButtonDemo.prototype._update = function() {
    // The spring is moving, and we just got called. Propagate the position of the spring into
    // the DOM via a scale transform.
    
    // We don't want the button to get too small, so use the spring to shrink it by up to 25%.
    var scale = 0.25 * this._spring.x() + 0.75;
    // Stupidly use translateZ(0) to force Chrome to make the spring button a composited layer
    // because its text scaling crawls.
    var transform = 'scale(' + scale + ') translateZ(0)';
    this._springButton.style.webkitTransform = transform;
    this._springButton.style.transform = transform;
}

window.addEventListener('load', function() { new ButtonDemo(document.getElementById('buttonExample')); }, false);
