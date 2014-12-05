'use strict';

// Pretend constraints system; solved by direct evaluation, doesn't handly anything tricky, but enough
// to try out physics constraints.

// Is value greater than the property?
function GreaterThanConstraint(getter, value) {
    this._getter = getter;
    this._value = value;
}
GreaterThanConstraint.prototype.violated = function() {
    return this._getter() < this._value;
}
GreaterThanConstraint.prototype.delta = function() {
    return this._value - this._getter();
}

// Is value less than the property?
function LessThanConstraint(getter, value) {
    this._getter = getter;
    this._value = value;
}
LessThanConstraint.prototype.violated = function() {
    return this._getter() > this._value;
}
LessThanConstraint.prototype.delta = function() {
    return this._value - this._getter();
}

// This is a value that incorporates velocity from direct manipulation and moves under friction afterwards.
function DirectValue() {
    this._x = 0;
    this._dx = 0;
    this._beingManipulated = false;
    this._dominantConstraint = null;
}
DirectValue.prototype.startMoving = function() {
    this._beingManipulated = true;
    this._startX = this.constrainedX();
}
DirectValue.prototype.moveBy = function(dx) {
    this._x = this._startX + dx;
}
DirectValue.prototype.endMoving = function(velocity) {
    this._dx = velocity;
    this._beingManipulated = false;
    this._x = this.constrainedX();
}
DirectValue.prototype.x = function() { return this._x; }
DirectValue.prototype.setDominantConstraint = function(c) { this._dominantConstraint = c; }
DirectValue.prototype.constrainedX = function() {
    if (!this._dominantConstraint) return this._x;
    var delta = this._dominantConstraint.delta();
    console.log('delta: ' + delta);
    if (this._beingManipulated) return this._x + delta / 2;
    return this._x + delta;
}

// Try and set something up like scrolling. Ideally I'd have values derived from the direct value
// (so I could have bottom which would be "top + height" or something). I'm not going to do that
// yet.
function example() {
    var scrollPosition = new DirectValue();
    var scrollPositionGetter = scrollPosition.x.bind(scrollPosition);

    // The scroll position must be less than zero (scroll position is the translation I add to
    // the object).
    var scrollTopConstraint = new LessThanConstraint(scrollPositionGetter, 0);
    // The scroll position must be greater than -200. You can't scroll past that. -200 should be
    // the "height of the content" - "height of the viewport".
    var scrollBottomConstraint = new GreaterThanConstraint(scrollPositionGetter, -200);

    // validate that nothing is violated yet.
    if (scrollTopConstraint.violated() || scrollBottomConstraint.violated())
        console.log('violated already :(');

    var constraints = [scrollBottomConstraint, scrollTopConstraint];

    // our "solver"
    function solve() {
        var dominantConstraint = null;
        for (var i = 0; i < constraints.length; i++) {
            var c = constraints[i];
            if (!c.violated()) continue;
            dominantConstraint = c;
        }
        // We can't handle more than one constraint being triggered, even if they're
        // the same constraint.
        scrollPosition.setDominantConstraint(dominantConstraint);
    }

    // make some dom objects, the outer (which masks the content) and the inner scrolling content.
    var outer = document.createElement('div');
    outer.className = 'scroll-outer';
    document.body.appendChild(outer);

    var inner = document.createElement('div');
    inner.className = 'scroll-content';
    inner.textContent = 'We looked and we saw him step in on the mat, we looked and we saw him the cat in the hat. In this box are two things I will show to you now.';
    outer.appendChild(inner);

    function render() {
        inner.style.transform = 'translateY(' + scrollPosition.constrainedX() + 'px)';
    }


    addTouchOrMouseListener(outer, {
        onTouchStart: function() { scrollPosition.startMoving(); },
        onTouchMove: function(dx, dy) { scrollPosition.moveBy(dy); solve(); render(); },
        onTouchEnd: function() { scrollPosition.endMoving(); solve(); render(); }
    });
}

example();
