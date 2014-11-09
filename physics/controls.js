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
    d.innerText = text;
    parent.appendChild(d);
    return d;
}

function addSlider(parent, config) {
    var d = document.createElement('div');
    d.className = 'slider-control-row';
    var label = document.createElement('span');
    label.className = 'label';
    label.innerText = config.label;
    d.appendChild(label);
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = config.min;
    slider.max = config.max;
    slider.step = config.step || 1;
    slider.value = config.read();
    d.appendChild(slider);
    var output = document.createElement('span');
    output.className = 'output';
    output.innerText = slider.value;
    d.appendChild(output);

    slider.addEventListener('change',
        function() {
            output.innerText = slider.value;
            config.write(slider.value);
        }, false);
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
Controls.prototype.addResetButton = function(callback) {
    var d = addText(this._element, 'Reset Position');
    d.className = 'reset-control';
    d.onclick = callback;
}

window.Controls = Controls;

})();
