'use strict';
// JavaScript implementation of a more physical Floating Action Button
// Copyright 2014 (C) Ralph Thomas, ralpht@gmail.com

(function() {

var epsilon = 0.001;
function almostEqual(a, b, epsilon) { return (a > (b - epsilon)) && (a < (b + epsilon)); }
function almostZero(a, epsilon) { return almostEqual(a, 0, epsilon); }

/***
 * Simple Spring implementation -- this implements a damped spring using a symbolic integration
 * of Hooke's law: F = -kx - cv. This solution is significantly more performant and less code than
 * a numerical approach such as Facebook Rebound which uses RK4.
 *
 * This physics textbook explains the model:
 *  http://www.stewartcalculus.com/data/CALCULUS%20Concepts%20and%20Contexts/upfiles/3c3-AppsOf2ndOrders_Stu.pdf
 */
function Spring(mass, springConstant, damping) {
    this._m = mass;
    this._k = springConstant;
    this._c = damping;
    this._solution = null;
    this._endPosition = 0;
    this._startTime = 0;
}
Spring.prototype._solve = function(initial, velocity) {
    var c = this._c;
    var m = this._m;
    var k = this._k;
    // Solve the quadratic equation; root = (-c +/- sqrt(c^2 - 4mk)) / 2m.
    var cmk = c * c - 4 * m * k;
    if (cmk == 0) {
        // The spring is critically damped.
        // x = (c1 + c2*t) * e ^(-c/2m)*t
        var r = -c / (2 * m);
        var c1 = initial;
        var c2 = velocity / (r * initial);
        return {
            x: function(t) { return (c1 + c2 * t) * Math.pow(Math.E, r * t); },
            dx: function(t) { var pow = Math.pow(Math.E, r * t); return r * (c1 + c2 * t) * pow + c2 * pow; }
        };
    } else if (cmk > 0) {
        // The spring is overdamped; no bounces.
        // x = c1*e^(r1*t) + c2*e^(r2t)
        // Need to find r1 and r2, the roots, then solve c1 and c2.
        var r1 = (-c - Math.sqrt(cmk)) / (2 * m);
        var r2 = (-c + Math.sqrt(cmk)) / (2 * m);
        var c2 = (velocity - r1 * initial) / (r2 - r1);
        var c1 = initial - c2;

        return {
            x: function(t) { return (c1 * Math.pow(Math.E, r1 * t) + c2 * Math.pow(Math.E, r2 * t)); },
            dx: function(t) { return (c1 * r1 * Math.pow(Math.E, r1 * t) + c2 * r2 * Math.pow(Math.E, r2 * t)); }
            };
    } else {
        // The spring is underdamped, it has imaginary roots.
        // r = -(c / 2*m) +- w*i
        // w = sqrt(4mk - c^2) / 2m
        // x = (e^-(c/2m)t) * (c1 * cos(wt) + c2 * sin(wt))
        var w = Math.sqrt(4*m*k - c*c) / (2 * m);
        var r = -(c / 2*m);
        var c1= initial;
        var c2= (velocity - r * initial) / w;
            
        return {
            x: function(t) { return Math.pow(Math.E, r * t) * (c1 * Math.cos(w * t) + c2 * Math.sin(w * t)); },
            dx: function(t) {
                var power =  Math.pow(Math.E, r * t);
                var cos = Math.cos(w * t);
                var sin = Math.sin(w * t);
                return power * (c2 * w * cos - c1 * w * sin) + r * power * (c2 * sin + c1 * cos);
            }
        };
    }
}
Spring.prototype.x = function(t) {
    if (!t) t = (new Date()).getTime();
    return this._solution ? this._endPosition + this._solution.x((t - this._startTime) / 1000.0) : 0;
}
Spring.prototype.dx = function(t) {
    if (!t) t = (new Date()).getTime();
    return this._solution ? this._solution.dx((t - this._startTime) / 1000.0) : 0;
}
Spring.prototype.setEnd = function(x, t) {
    if (!t) t = (new Date()).getTime();
    if (x == this._endPosition) return;
    var velocity = 0;
    var position = this._endPosition;
    if (this._solution) {
        velocity = this._solution.dx((t - this._startTime) / 1000.0);
        position = this._solution.x((t - this._startTime) / 1000.0);
        if (almostZero(velocity, epsilon)) velocity = 0;
        if (almostZero(position, epsilon)) position = 0;
        position += this._endPosition;
    }
    if (this._solution && almostZero(position - x, epsilon) && almostZero(velocity, epsilon))
        return;
    this._endPosition = x;
    this._solution = this._solve(position - this._endPosition, velocity);
    this._startTime = t;
}
Spring.prototype.snap = function(x) {
    this._startTime = (new Date()).getTime();
    this._endPosition = x;
    this._solution = {
        x: function() { return 0; },
        dx: function() { return 0; }
    };
}

/*
 * Now the interesting bit, a FAB menu item. The menu item has a spring which moves it from its natural layout
 * position to being against the current cursor position. The menu has a separate spring which moves menu items
 * from the origin to thier natural layout position.
 *
 * The menu item doesn't actually position itself, the menu does this with transforms derived from the spring
 * positions.
 */
function MenuItem(title, image) {
    // Build the DOM.
    this._container = document.createElement('div');
    this._container.className = 'fab-menu-item';
    this._launch = document.createElement('div');
    this._launch.className = 'fab-launch';
    this._container.appendChild(this._launch);
    this._label = document.createElement('div');
    this._label.className = 'fab-label';
    this._label.innerText = title;
    this._container.appendChild(this._label);
    this._icon = document.createElement('div');
    this._icon.className = 'fab-icon';
    if (image) {
        this._icon.style.backgroundImage = 'url(' + image + ')';
        this._icon.style.backgroundColor = 'transparent';
    }
    this._container.appendChild(this._icon);
    // We need a spring to tell us how far away we should be from the cursor.
    this._spring = new Spring(1, 400, 30); // 400 / 30 is slightly underdamped, so there will be a slight overbounce.
}
MenuItem.prototype.element = function() { return this._container; }
MenuItem.prototype.icon = function() { return this._icon; }
MenuItem.prototype.label = function() { return this._label; }
MenuItem.prototype.launch = function() { return this._launch; }
MenuItem.prototype.setCursorIsClose = function(isCursorClose) { this._spring.setEnd(isCursorClose ? 1 : 0); }
MenuItem.prototype.cursorAttraction = function() { return this._spring.x(); }

/*
 * Magic numbers for the FloatingActionButton.
 */
var ITEM_SIZE = 80; // The height of an item, including padding.
var STICKINESS = 20; // How "sticky" an item is as you start to track left.

/*
 * This is the menu itself. It creates an item for the cursor, and then a bunch of items for each option.
 * It lays them out in a vertical stack. It listens for touch events to open the stack and to move the
 * cursor item around. The cursor is the main button.
 */
function FloatingActionButton(title, image, items) {
    // The spring that opens the menu.
    this._openSpring = new Spring(1, 400, 25);
    this._cursorSpring = new Spring(1, 300, 20);
    this._maskSpring = new Spring(1, 800, 60);
    this._container = document.createElement('div');
    this._container.className = 'fab-menu';
    this._mask = document.createElement('div');
    this._mask.className = 'fab-mask';
    this._container.appendChild(this._mask);


    this._items = [];
    for (var i = 0; i < items.length; i++) {
        var mi = new MenuItem(items[i].title, items[i].image);
        mi.element().style.pointerEvents = 'none';
        this._items.push(mi);
        this._container.appendChild(mi.element());
    }

    this._cursor = new MenuItem(title, image);
    this._container.appendChild(this._cursor.element());
    this._cursor.icon().textContent = '+';

    var isOpen = false;
    var self = this;
    var touchInfo = { trackingID: -1, maxDy: 0 };

    function touchStart(e) {
        if (touchInfo.trackingID != -1) return;
        e.preventDefault();
        if (e.type == 'touchstart') {
            touchInfo.trackingID = e.changedTouches[0].identifier;
            touchInfo.x = e.changedTouches[0].pageX;
            touchInfo.y = e.changedTouches[0].pageY;
        } else {
            if (e.target != self._cursor.icon()) return;
            touchInfo.trackingID = 'mouse';
            touchInfo.x = e.screenX;
            touchInfo.y = e.screenY;
        }
        touchInfo.maxDy = 0;
        touchInfo.wasOpen = isOpen;
        isOpen = true;
        self._openSpring.setEnd(1);
        self._maskSpring.setEnd(2);
    }

    function findDelta(e) {
        if (e.type == 'touchmove' || e.type == 'touchend') {
            for (var i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier == touchInfo.trackingID) {
                    return {x: e.changedTouches[i].pageX - touchInfo.x, y: e.changedTouches[i].pageY - touchInfo.y};
                }
            }
        } else {
            return {x: e.screenX - touchInfo.x, y: e.screenY - touchInfo.y};
        }
        return null;
    }

    function touchMove(e) {
        if (touchInfo.trackingID == -1) return;
        e.preventDefault();
        var delta = findDelta(e);
        if (!delta) return;
        self._updateCursor(delta.y, delta.x, true);
        touchInfo.maxDy = Math.max(touchInfo.maxDy, Math.abs(delta.y));
    }
    function touchEnd(e) {
        if (touchInfo.trackingID == -1) return;
        e.preventDefault();
        var delta = findDelta(e);
        if (!delta) return;

        touchInfo.trackingID = -1;
        if (touchInfo.maxDy == 0 && !touchInfo.wasOpen) return;
        self._updateCursor(0, 0, false);
        isOpen = false;
        self._openSpring.setEnd(0);
        self._maskSpring.setEnd(0);
    }

    this._cursor.element().addEventListener('touchstart', touchStart, false);
    this._cursor.element().addEventListener('touchmove', touchMove, false);
    this._cursor.element().addEventListener('touchend', touchEnd, false);
    
    document.body.addEventListener('mousedown', touchStart, false);
    document.body.addEventListener('mousemove', touchMove, false);
    document.body.addEventListener('mouseup', touchEnd, false);

    this._cursorPosition = 0;
    this._selected = 0;

    this._layout();
}
var id = new WebKitCSSMatrix();

FloatingActionButton.prototype.element = function() { return this._container; }
FloatingActionButton.prototype._layout = function() {
    function clamp(x, min, max) { return (x < min ? min : (x > max ? max : x)); }
    var openAmount = this._openSpring.x();
    var cursorPosition = this._cursorPosition * this._cursorSpring.x();
    
    var y = 0;
    for (var i = 0; i < this._items.length; i++) {
        var item = this._items[i];
        y -= ITEM_SIZE;
        var naturalPosition = y * openAmount;
        var cursorAttraction = item.cursorAttraction();
        // The actual position is somewhere between the natural position (which is the layout
        var computedPosition = naturalPosition * (1 - cursorAttraction) + cursorPosition * cursorAttraction;
        var x = this._cursorX * cursorAttraction;

        if (almostZero(x, 0.1)) x = 0;
        if (almostZero(computedPosition, 0.1)) computedPosition = 0;
        if (almostZero(cursorAttraction, 0.01)) cursorAttraction = 0;

        item.element().style.webkitTransform = 'translate3D(0, ' + computedPosition + 'px, 0)';
        item.element().style.opacity = clamp(openAmount * 1.3 - 0.1, 0, 1);
        item.icon().style.webkitTransform = id.translate(x, 0).scale(0.8 + cursorAttraction * 0.4) + ' translateZ(0)';
        item.label().style.opacity = clamp(1 + x / 50, 0, 1);

        var maskSize = Math.abs(x);
        var launchOffset = 0;

        if (maskSize > 160) {
            launchOffset = -(maskSize - 160);
            maskSize = 160;
        }

        item.launch().style.webkitTransform = id.translate(launchOffset, 0);
        item.launch().style.webkitClipPath = 'circle(' + maskSize + 'px)';
    }
    this._cursor.icon().style.webkitTransform = id.translate(this._cursorX * this._cursorSpring.x(), cursorPosition).scale(1 - openAmount * 0.2) + ' translateZ(0)';
    this._cursor.label().style.opacity = openAmount;
    this._cursor.label().style.webkitTransform = 'translate3D(' + (30 + openAmount * -30) + 'px, 0, 0)';
    this._mask.style.webkitTransform = 'scale(' + this._maskSpring.x() + ') translateZ(0)';

    requestAnimationFrame(this._layout.bind(this));
}
var zIndex = 1;
FloatingActionButton.prototype._updateCursor = function(position, x, isActive) {
    if (!isActive) {
        this._cursorSpring.setEnd(0);
        this._selected = 0;
        for (var i = 0; i < this._items.length; i++) {
            this._items[i].setCursorIsClose(false);
        }
        return;
    }
    if (x > 0) x /= 4;
    this._cursorX = x;
    this._cursorSpring.snap(1);

    // Manipulate the position so that when you track to the left, you get more stuck on that item.
    var stickiness = Math.max(Math.abs(x / STICKINESS), 1);
    var snap = -this._selected * ITEM_SIZE;
    position = (position - snap) / stickiness + snap;

    this._cursorPosition = position;

    // Figure out which item should be selected.
    var selected = ~~Math.round(-position / ITEM_SIZE);
    for (var i = 0; i < this._items.length; i++) {
        var item = this._items[i];
        var selectionIndex = i + 1;
        item.setCursorIsClose(selectionIndex == selected);
        if (selected != this._selected && selectionIndex == selected)
            item.element().style.zIndex = (++zIndex);
    }
    this._selected = selected;
}

/*
 * Actually create the menu.
 */
var testMenu = new FloatingActionButton(
    'Compose', null,//'img/compose.png', 
    [
        { title: 'Paul Krugman', image: 'img/krugman.png' },
        { title: 'Sophocles', image: 'img/greek.jpg' },
        { title: 'Ralph Thomas', image: 'img/ralpht.jpg' },
    ]);

var phone = document.createElement('div');
phone.className = 'phone';
phone.appendChild(testMenu.element());

document.body.appendChild(phone);
})();
