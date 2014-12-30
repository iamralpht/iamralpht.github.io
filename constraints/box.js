"use strict";

(function() {

var dPR = window.devicePixelRatio;
function roundOffset(x) { return Math.round(x * dPR) / dPR; }

// This is a DOM block which is positioned from the constraint solver rather than
// via flow.
function Box(textContentOrElement) {
    if (textContentOrElement && textContentOrElement.style) {
        this._element = textContentOrElement;
    } else {
        this._element = document.createElement('div');
        this._element.className = 'box';
        if (textContentOrElement) this._element.textContent = textContentOrElement;
    }

    // These get replaced with constraint variables by the caller.
    this.x = 0;
    this.y = 0;
    this.right = 100;
    this.bottom = 100;

    this._children = [];

    this.update();
}
Box.prototype.element = function() { return this._element; }
Box.prototype.addChild = function(box) { this._children.push(box); }
Box.prototype.update = function(px, py) {
    function get(variable) {
        if (variable.valueOf) return variable.valueOf();
        return variable;
    }
    var x = get(this.x);
    var y = get(this.y);
    var right = get(this.right);
    var bottom = get(this.bottom);

    var w = Math.max(0, right - x);
    var h = Math.max(0, bottom - y);

    for (var i = 0; i < this._children.length; i++) {
        this._children[i].update(x, y);
    }

    if (!px) px = 0;
    if (!py) py = 0;
    x -= px;
    y -= py;

    x = roundOffset(x);
    y = roundOffset(y);
    w = roundOffset(w);
    h = roundOffset(h);

    // Be careful about updating width and height since it'll
    // trigger a browser layout.
    if (w != this._lastWidth) {
        this._lastWidth = w;
        this._element.style.width = w + 'px';
    }
    if (h != this._lastHeight) {
        this._lastHeight = h;
        this._element.style.height = h + 'px';
    }
    if (x == this._lastX && y == this._lastY) return;
    this._lastX = x; this._lastY = y;
    // Use transform to set the x/y since this is the common
    // case and it generally avoids a relayout.
    var transform = 'translate3D(' + x + 'px, ' + y + 'px, 0)';
    this._element.style.webkitTransform = transform;
    this._element.style.transform = transform;
}

window.Box = Box;

})();
