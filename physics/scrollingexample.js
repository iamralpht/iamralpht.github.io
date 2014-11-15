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

/*
 * Scrolling example. Simple list-of-contacts thing from 2007.
 */
function ScrollingDemo(element) {
    this._element = element;
    this._element.classList.add('scrollingdemo');

    // The outer is the frame that doesn't move. This contains the long block that moves
    // up and down (clipped to the outer).
    this._outer = document.createElement('div');
    this._outer.className = 'scrolling-outer';

    this._scroller = document.createElement('div');
    this._scroller.className = 'scrolling-inner';

    this._outer.appendChild(this._scroller);

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
    // Make some list items
    for (var i = 0; i < 30; i++) {
        var m = model[i % model.length];
        var d = document.createElement('div');
        d.className = 'scrolling-list-item';
        var img = document.createElement('div');
        img.className = 'scrolling-list-img';
        img.style.backgroundImage = 'url(' + m.url + ')';
        d.appendChild(img);
        var text = document.createElement('span');
        text.innerText = m.band;
        d.appendChild(text);
        this._scroller.appendChild(d);
    }

    this._element.appendChild(this._outer);
    
    var scrollHandler = new ScrollHandler(this._scroller);
    addTouchOrMouseListener(this._outer, scrollHandler);

    var controls = new Controls();
    controls.addModel(scrollHandler.configuration(), 'Scrolling');
    this._element.appendChild(controls.element());
}

window.addEventListener('load', function() { new ScrollingDemo(document.getElementById('scrollingExample')); }, false);
