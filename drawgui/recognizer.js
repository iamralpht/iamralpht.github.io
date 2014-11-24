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

// Gesture recognizing overlay

function Recognizer() {
    this._element = document.createElement('div');
    this._element.className = 'gesture-recognizer';
    this._created = document.createElement('div');
    this._created.className = 'gesture-generated';
    this._element.appendChild(this._created);
    this._display = document.createElement('canvas');
    this._element.appendChild(this._display);

    this._label = document.createElement('span');
    this._label.className = 'recognized';
    this._element.appendChild(this._label);

    this._context = this._display.getContext('2d');
    this._context.strokeStyle = 'blue';
    this._context.lineWidth = 3;
    this._context.lineCap = 'round';

    this._dollar = new Dollar.Recognizer();
    addGestures(this._dollar);

    addTouchOrMouseListener(this._element, this);
    var self = this;
    function resize() {
        var w = self._element.offsetWidth;
        var h = self._element.offsetHeight;
        self._display.width = w;
        self._display.height = h;
        self._context = self._display.getContext('2d');
        self._context.strokeStyle = 'blue';
        self._context.lineWidth = 3;
        self._context.lineCap = 'round';
    }
    window.addEventListener('resize', resize, false);
    setTimeout(resize, 0);
}
Recognizer.prototype.element = function() { return this._element; }
Recognizer.prototype.onTouchStart = function(x, y) {
    this._points = [];
    this._context.clearRect(0, 0, 2048, 2048);
    this._context.beginPath();
    x -= this._element.offsetLeft;
    y -= this._element.offsetTop;
    this._startX = x; this._startY = y;

    this._context.moveTo(x, y);

    this._points.push(new Dollar.Point(x, y));

}
Recognizer.prototype.onTouchMove = function(dx, dy) {
    var x = this._startX + dx;
    var y = this._startY + dy;
    this._context.lineTo(x, y);
    this._context.stroke();
    this._points.push(new Dollar.Point(x, y));
}
Recognizer.prototype.onTouchEnd = function() {
    var result = this._dollar.Recognize(this._points);
    this._label.textContent = result.Name;// + ' score: ' + result.Score.toFixed(2) + ' angle: ' + result.Angle.toFixed(2);

    var bbox = Dollar.boundingBox(this._points);
    var centroid = Dollar.centroid(this._points);

    if (result.Name == 'rectangle' || result.Name == 'circle') {
        var rect = document.createElement('div');
        rect.className = result.Name;
        rect.style.left = bbox.X + 'px';
        rect.style.top = bbox.Y + 'px';
        rect.style.width = bbox.Width + 'px';
        rect.style.height = bbox.Height + 'px';
        this._created.appendChild(rect);
    }
    /*
    var str = '';
    for (var i = 0; i < this._points.length; i++) {
        str += 'new Dollar.Point(' + this._points[i].X + ', ' + this._points[i].Y + '), ';
    }
    console.log('this._dollar.AddGesture(name, [' + str + ']);');
    */
}
