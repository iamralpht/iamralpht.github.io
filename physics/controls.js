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

(function() {
// This module provides a set of controls similar to dat.js for manipulating
// the configuration of our physics objects. The examples use this so that you
// can learn what effect the strength of gravity or spring constants have on
// the animation or interaction you're experimenting with.

function Controls() {
    this._element = document.createElement('div');
    this._element.className = 'controls';
}
Controls.prototype.element = function() { return this._element; }

function addText(parent, text) {
    var d = document.createElement('div');
    d.className = 'label-control-row';
    d.textContent = text;
    parent.appendChild(d);
    return d;
}

// NOTE: I was previously using the HTML5 range input control here, but it's abysmally unusable
//       on iOS and (merely) pretty dreadful on Chrome for Android... so I rolled my own which
//       doesn't implement the accessibility stuff, but is more usable on touch devices. I'd
//       already written an example using sliders, so it made sense to just use that for the
//       rest of the page... although, I removed the physics! I don't think sliders with
//       physical models are useful for precision movement.

var SLIDER_LENGTH = 180;
function Slider(config, color) {
    this._model = {
        min: config.min,
        max: config.max,
        step: config.step || 1,
        onchange: config.write
    };
    var current = config.read();

    this._slider = document.createElement('div');
    this._slider.className = 'slider';

    var minLabel = document.createElement('div');
    minLabel.className = 'slider-min-label label';
    minLabel.textContent = config.min;
    this._slider.appendChild(minLabel);

    var maxLabel = document.createElement('div');
    maxLabel.className = 'slider-max-label label';
    maxLabel.textContent = config.max;
    this._slider.appendChild(maxLabel);

    this._thumb = document.createElement('div');
    this._thumb.className = 'thumb';
    this._thumb.style.backgroundColor = color;

    var valueBG = document.createElement('div');
    valueBG.className = 'value-bg';
    this._thumb.appendChild(valueBG);

    this._value = document.createElement('div');
    this._value.className = 'value';
    this._thumb.appendChild(this._value);

    this._slider.appendChild(this._thumb);

    addTouchOrMouseListener(this._thumb, this);

    this._position = ((current - this._model.min) / (this._model.max - this._model.min)) * SLIDER_LENGTH;
    this._startPosition = 0;

    this._update();
    this._report();
}
Slider.prototype.element = function() { return this._slider; }
Slider.prototype.onTouchStart = function() {
    // Remember where the thumb was when the drag started, cancel any animation that's ongoing.
    this._startPosition = this._position;
    // XXX: Style recalcs are really _really_ slow
    this._slider.classList.add('active');
}

function clamp(x, min, max) {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

Slider.prototype.onTouchMove = function(dx, dy) {
    // Clamp the position of the thumb while dragging.
    this._position = clamp(this._startPosition + dx, 0, SLIDER_LENGTH);
    this._update();
    this._report();
}
Slider.prototype.onTouchEnd = function(dx, dy, velocity) {
    this._slider.classList.remove('active');
}
Slider.prototype._update = function() {
    // Apply the position as a transform.
    var transform = 'translateX(' + Math.round(this._position) + 'px) translateZ(0)';
    this._thumb.style.webkitTransform = transform;
    this._thumb.style.transform = transform;
}
Slider.prototype._report = function() {
    var val = this._position / SLIDER_LENGTH;
    var mapped = this._model.min + (this._model.max - this._model.min) * val;
    mapped = Math.round(mapped / this._model.step) * this._model.step;
    // Update our value.
    var stringified = mapped;
    if (Math.abs(stringified) < 1) {
        // Hacky stringification.
        var fixedLength = 3;
        if (this._model.step == 0.1) fixedLength = 1;
        else if (this._model.step == 0.01) fixedLength = 2;
        stringified = stringified.toFixed(fixedLength);
    }
    this._value.textContent = stringified;
    if (this._model.onchange) this._model.onchange(mapped);
}

function addSlider(parent, config) {
    var d = document.createElement('div');
    d.className = 'slider-control-row';
    var label = document.createElement('span');
    label.className = 'label';
    label.textContent = config.label;
    d.appendChild(label);

    var slider = new Slider(config);
    d.appendChild(slider.element());

    parent.appendChild(d);
}

Controls.prototype.addText = function(text) { addText(this._element, text); }

Controls.prototype.addModel = function(spring, name) {
    var springSection = document.createElement('div');
    if (name) addText(this._element, name);
    var config = Array.isArray(spring) ? spring : spring.configuration();

    for (var i = 0; i < config.length; i++) {
        addSlider(this._element, config[i]);
    }
}
Controls.prototype.addResetButton = function(callback, label) {
    var d = addText(this._element, label || 'Reset Position');
    d.className = 'reset-control';
    d.onclick = callback;
}

window.Controls = Controls;

})();
