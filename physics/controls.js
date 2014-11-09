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
}

function addSlider(parent, text, min, max, current, callback) {
    var d = document.createElement('div');
    d.className = 'slider-control-row';
    var label = document.createElement('span');
    label.className = 'label';
    label.innerText = text;
    d.appendChild(label);
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = 1;
    slider.value = current;
    d.appendChild(slider);
    var output = document.createElement('span');
    output.className = 'output';
    output.innerText = current;
    d.appendChild(output);

    slider.addEventListener('change',
        function() {
            output.innerText = slider.value;
            if (callback) callback(slider.value);
        }, false);
    parent.appendChild(d);
}

Controls.prototype.addSpring = function(spring, name) {
    function updateConstant(s, c) { s.reconfigure(1, c, s.damping()); }
    function updateDamping(s, d) { s.reconfigure(1, s.springConstant(), d); }

    var springSection = document.createElement('div');
    if (name) addText(this._element, name);
    addSlider(this._element, 'Spring Constant', 100, 800, spring.springConstant(), updateConstant.bind(null, spring));
    addSlider(this._element, 'Damping', 1, 100, spring.damping(), updateDamping.bind(null, spring));
}

window.Controls = Controls;

})();
