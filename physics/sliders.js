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

    function Slider(model) {
        this._element = document.createElement('div');
        this._element.className = 'slider-container';

        this._slider = document.createElement('div');
        this._slider.className = 'slider';
        this._element.appendChild(this._slider);

        this._thumb = document.createElement('div');
        this._thumb.className = 'thumb';

        this._slider.appendChild(this._thumb);

        addMouseOrTouchListener(this._thumb, this);

        this._model = model;

        var controls = new Controls();
        controls.addModel(model);
        this._element.appendChild(controls.element());

        this._position = 0;
        this._startPosition = 0;
    }
    Slider.prototype.onTouchStart = function() {
        this._startPosition = this._position;
        if (this._animation) this._animation.cancel();
    }

    function clamp(x, min, max) {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    Slider.prototype.onTouchMove = function(dx, dy) {
        this._position = clamp(this._startPosition + dx, 0, 250);

        var transform = 'translateX(' + this._position + 'px) translateZ(0)';
        this._thumb.style.transform = transform;
    }
    Slider.prototype.onTouchEnd = function(dx, dy, velocity) {
        this._position = clamp(this._startPosition + dx, 0, 250);

    }
}
