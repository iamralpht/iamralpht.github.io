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

function Dialog(position, ground, squish, rotate) {
    this._rotateAngle = -15;
    this._element = document.createElement('div');
    this._element.className = 'dialog';

    this._element.innerHTML =
        '<div class="dialog-title">Hello World!</div>' +
        '<div class="dialog-button">Option A</div>' +
        '<div class="dialog-button">Option B</div>';

    this._position = position;
    // When we're squishy we use different spring constants so that the dialog
    // doesn't get so stretched out.
    if (squish) {
        this._fall = new Fall(ground, 5000, 367, 10);
    } else if (rotate) {
        this._fall = new Fall(ground, 686, 404, 37);
    } else {
        this._fall = new Fall(ground, 5000, 180, 20);
    }
    this._fall.set(position, 0);

    this._squishy = squish;
    this._rotate = rotate;

    // Move the transform origin if the dialog is squishy.
    if (squish)
        this._element.classList.add('squishy');

    this._animation = animation(this._fall, this._update.bind(this));
}
Dialog.prototype.element = function() { return this._element; }
Dialog.prototype.model = function() { return this._fall; }
Dialog.prototype._update = function() {
    var y = this._fall.x();
    var transform = '';
    // We can just translate here if y < 0 or if we're not squishy.
    if (y < 0 || !this._squishy) {
        transform = 'translateY(' + y + 'px) translateZ(0)';
    } else {
        // We are squishy and we need to squish. We want the top of
        // the dialog to move downwards with the bottom staying level.
        // The dialog's transform origin has been set so that scales
        // are relative to the bottom center.
        //
        // We're also going to conserve area--the dialog won't lose
        // any pixels during the squish.
        
        // The top wants to move down by y. The height of the dialog
        // is 192px. Therefore
        //     y = 192 - 192 * scale
        // =>  scale = (y - 192) / 192.
        var yscale = -(y - 192) / 192;
        
        // Conserve area. The width is 300px, therefore the normal
        // area is 300x192. So when squished by yscale, the xscale
        // should be:
        //    300x192 = (300 * xscale) * (192 * yscale)
        // => xscale = ((300*192)/(192*yscale)) / 300
        // => xscale = 1/yscale
        var xscale = 1 / yscale;
        transform = 'scale(' + xscale + ', ' + yscale + ') translateZ(0)';
    }
    if (this._rotate && y < 0) {
        // We want the rotation to be zero degrees by the time we
        // hit the ground, so just map y like that. This is an example
        // of using a physics model to control a secondary attribute.
        var amount = -y / 500;
        var angle = this._rotateAngle * amount;
        transform += ' rotateZ(' + angle + 'deg)';
    }
    this._element.style.webkitTransform = transform;
    this._element.style.transform = transform;
}
Dialog.prototype.reset = function() {
    this._animation.cancel();
    this._fall.set(this._position, 0);
    this._animation = animation(this._fall, this._update.bind(this));
}

//
// Falling dialogs. Use the fall simulation (a combination of gravity and
// a spring) to make a soft landing for our daring dialog.
//
function FallingDialogsDemo(element, squishy, rotate) {
    this._element = element;
    this._element.classList.add('dialogs');

    var dialog = new Dialog(-600, 0, squishy, rotate);
    var controls = new Controls();
    controls.addText(squishy ? 'Squishy Falling Dialog' : 'Falling Dialog');
    controls.addModel(dialog.model());
    if (rotate) {
        var rotateModel = {
            label: 'Rotation',
            min: -60,
            max: 60,
            read: function() { return dialog._rotateAngle; },
            write: function(x) { dialog._rotateAngle = x; }
        };
        controls.addModel([rotateModel]);
    }
    controls.addResetButton(dialog.reset.bind(dialog), 'Start Animation');
    this._element.appendChild(dialog.element());
    this._element.appendChild(controls.element());
}

window.addEventListener('load', function() {
    new FallingDialogsDemo(document.getElementById('fallingDialogsExample'));
    new FallingDialogsDemo(document.getElementById('squishyDialogsExample'), true);
    new FallingDialogsDemo(document.getElementById('rotatingDialogsExample'), false, true);
}, false);
