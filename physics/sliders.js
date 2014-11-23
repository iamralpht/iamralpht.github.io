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
// Sliders demo. One slider's motion after release comes from friction, the other from deceleration.
//
function SlidersDemo(element) {
    this._element = element;
    this._element.classList.add('sliderdemo');

    var SLIDER_LENGTH = 350;

    function Slider(model, name, color) {
        this._element = document.createElement('div');
        this._element.className = 'slider-container';

        this._slider = document.createElement('div');
        this._slider.className = 'slider';
        this._element.appendChild(this._slider);

        this._thumb = document.createElement('div');
        this._thumb.className = 'thumb';
        this._thumb.style.backgroundColor = color;

        this._slider.appendChild(this._thumb);

        addTouchOrMouseListener(this._thumb, this);

        this._model = model;

        var controls = new Controls();
        controls.addText(name);
        controls.addModel(model);
        this._element.appendChild(controls.element());

        this._position = 0;
        this._startPosition = 0;
    }
    Slider.prototype.element = function() { return this._element; }
    Slider.prototype.onTouchStart = function() {
        // Remember where the thumb was when the drag started, cancel any animation that's ongoing.
        this._startPosition = this._position;
        if (this._animation) this._animation.cancel();
    }

    function clamp(x, min, max) {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    Slider.prototype.onTouchMove = function(dx, dy) {
        // Clamp the position of the thumb while dragging.
        this._position = clamp(this._startPosition + dx, 0, SLIDER_LENGTH);

        // Apply the position as a transform.
        var transform = 'translateX(' + this._position + 'px) translateZ(0)';
        this._thumb.style.webkitTransform = transform;
        this._thumb.style.transform = transform;
    }
    Slider.prototype.onTouchEnd = function(dx, dy, velocity) {
        this._position = clamp(this._startPosition + dx, 0, SLIDER_LENGTH);
        this._model.set(this._position, velocity.x);
        this._animation = animation(this._model, this._update.bind(this));
    }
    Slider.prototype._update = function() {
        // This is a crummy feeling simulation at the ends. We just clamp the
        // value so the extra momentum is completely lost.
        this._position = clamp(this._model.x(), 0, SLIDER_LENGTH);
        var transform = 'translateX(' + this._position + 'px) translateZ(0)';
        this._thumb.style.webkitTransform = transform;
        this._thumb.style.transform = transform;
    }

    var decelerate = new Gravity(1000, 1000);
    // We let it decelerate until the velocity changes direction, then we terminate the
    // animation. Accomplish this by remembering the sign of the initial velocity and
    // then declaring ourselves "done" when that changes.
    function sign(x) { return (x > 0) ? 1 : ((x < 0) ? -1 : 0); }
    decelerate.set = function(x, v) {
        this._direction = sign(v);
        if (this._direction != 0)
            this._a = Math.abs(this._a) * this._direction * -1;
        Gravity.prototype.set.call(this, x, v);
    }
    decelerate.done = function() {
        if (sign(this.dx()) != this._direction) return true;
        return false;
    }
    decelerate.configuration = function() {
        var config = Gravity.prototype.configuration.call(this);
        config[0].min = 0;
        config[0].max = 6000;
        config[0].label = 'Deceleration';
        return config;
    }

    var decelSlider = new Slider(decelerate, 'Decelerating Slider', '#795548');
    this._element.appendChild(decelSlider.element());

    // Make a friction-slowed slider.
    var friction = new Friction(0.01);
    var frictionSlider = new Slider(friction, 'Friction Slider', '#1b5e20');
    this._element.appendChild(frictionSlider.element());
}
window.addEventListener('load', function() { new SlidersDemo(document.getElementById('slidersExample')); }, false);
