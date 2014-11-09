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
// Android Wear back navigation demo. We create two "watches" and you can drag
// horizontally to back up. One uses a CSS transition with the same duration
// every time, the other uses an overdamped spring to incorporate the existing
// momentum from the drag.
//
function AndroidWearDemo(element) {
    this._element = element;
    this._element.classList.add('androidwear');

    function Watch(useCSS) {
        this._element = document.createElement('div');
        this._element.className = 'watch';
        this._useCSS = useCSS;

        this._menu = document.createElement('div');
        this._menu.className = 'menu';

        this._element.appendChild(this._menu);

        addTouchOrMouseListener(this._menu, this);

        this._position = 0;
        this._startPosition = 0;

        // XXX: Add some controls to reset the menu once you've
        //      dismissed it.
    }
    Watch.prototype.element = function() { return this._element; }
    Watch.prototype.onTouchStart = function() {
        this._startPosition = this._position;
        // Disable transitions while we're dragging. We don't want the browser
        // to animate from the old transform to the new one while our finger
        // is on the menu; we need it to snap there.
        this._menu.style.transition = 'none';
    }
    Watch.prototype.onTouchMove = function(dx) {
        this._position = this._startPosition + dx;
        // If the finger is dragging the menu in a direction it won't go then
        // make the movement less effective.
        if (this._position < 0) this._position /= 3;

        var transform = 'translateX(' + this._position + 'px) translateZ(0)';
        this._menu.style.transform = transform;
    }
    Watch.prototype.onTouchEnd = function(dx, dy, velocity) {
        this._position = 0;
        var transform = 'translateX(0px) translateZ(0)';
        if (this._useCSS) this._menu.style.transition = 'transform 200ms';
        this._menu.style.transform = transform;
    }

    var cssWatch = new Watch(true);
    var springWatch = new Watch(false);

    this._element.appendChild(cssWatch.element());
    this._element.appendChild(springWatch.element());
}
window.addEventListener('load', function() { new AndroidWearDemo(document.getElementById('androidWearExample')); }, false);
