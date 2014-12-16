"use strict";
// constraint solver for pinch-zoom.

// Helpers to make cassowary.js a bit clearer.
var weak = c.Strength.weak;
var medium = c.Strength.medium;
var strong = c.Strength.strong;
var required = c.Strength.required;

var eq  = function(a1, a2, strength, w) {
  return new c.Equation(a1, a2, strength || weak, w||0);
};
var neq = function(a1, a2, a3) { return new c.Inequality(a1, a2, a3); };
var geq = function(a1, a2, str, w) { return new c.Inequality(a1, c.GEQ, a2, str, w); };
var leq = function(a1, a2, str, w) { return new c.Inequality(a1, c.LEQ, a2, str, w); };

var stay = function(v, strength, weight) {
  return new c.StayConstraint(v, strength||weak, weight||0);
};
var weakStay =     function(v, w) { return stay(v, weak,     w||0); };
var mediumStay =   function(v, w) { return stay(v, medium,   w||0); };
var strongStay =   function(v, w) { return stay(v, strong,   w||0); };
var requiredStay = function(v, w) { return stay(v, required, w||0); };

// Not sure how this will work out. I don't think that pinch-zoom with rotation can be expressed as
// linear constraints which is frustrating. Pinch-zoom without rotation is overconstrained; you can't
// find a solution.
// 
// Traditionally pinch zoom is implemented by scaling and translating relative to the center point
// of the two fingers (and then it gets complicated when you do the second zoom gesture on an already
// zoomed image). So this is an experiement to find out what happens if we don't consider the center
// point...

// We have some variables that will always exist:
//  tx -- translation in x
//  ty -- translation in y
//  scale -- the scale of the image
//
// When a touchpoint is created we're going to create some constraints just for that point:
//  fx -- the finger's x coordinate
//  fy -- the finger's y coordinate
//
// We create constraints saying that we want each finger to remain over the same pixel of the image.
// To do that we figure out which pixel it's over to start with, and then just create a constraint
// of that:
//  px = (fx/scale) - tx
//  py = (fy/scale) - ty
//
// XXX: By doing this I learned that I can't express variable/variable or variable*variable using the
//      cassowary solver. Tomorrow I'll try using constraint relaxation instead (which will work for
//      sure, but will be much slower). I figured I'd commit this since it reflects my current thinking
//      of how constraints could be used to solve UI problems. I want to build this into a whole photo
//      viewer UI--pan with bouncy physics, pinch zoom, pan or flick hard to advance to the next photo, etc.

var solver = new MultiEditSolver(new c.SimplexSolver());

var tx = new c.Variable({name: 'translation-x'});
var ty = new c.Variable({name: 'translation-y'});
var scale = new c.Variable({name: 'scale'});

// This class represents a currently active touch point.
function ActiveTouchPoint(id, x, y) {
    this.fx = new c.Variable({name: 'finger-' + id});
    this.fy = new c.Variable({name: 'finger-' + id});
    solver.add(weakStay(this.fx));
    solver.add(weakStay(this.fy));

    // This is the point where the finger hit the image.
    var px = x / scale.valueOf() - tx.valueOf();
    var py = y / scale.valueOf() - ty.valueOf();

    // Now constrain it.
    solver.add(this._xconstraint = eq(c.minus(c.divide(this.fx, scale), tx), px, weak, 100));
    solver.add(this._yconstraint = eq(c.minus(c.divide(this.fy, scale), ty), py, weak, 100));
    solver.solve();

    solver.beginEdit(this.fx, medium);
    solver.beginEdit(this.fy, medium);
}
ActiveTouchPoint.prototype.move = function(x, y) {
    solver.suggestValue(this.fx, x);
    solver.suggestValue(this.fy, y);
}
ActiveTouchPoint.prototype.end = function() {
    solver.endEdit(this.fx);
    solver.endEdit(this.fy);

    solver.removeConstraint(this._xconstraint);
    solver.removeConstraint(this._yconstraint);
}

// Now create a DOM and bind up touch handlers
var image = document.getElementById('image');

function update() {
    solver.solve();
    var tx = 'translate(' + tx.valueOf() + 'px, ' + ty.valueOf() + 'px) scale(' + scale.valueOf + ')';
    image.style.webkitTransform = tx;
    image.style.transform = tx;
}

var touchPoints = {};
image.addEventListener('touchstart', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var touchPointMapper = new ActiveTouchPoint(t.identifier, t.pageX, t.pageY);
        touchPoints[t.identifier] = touchPointMapper;
    }
    update();
}, false);
image.addEventListener('touchmove', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (!touchPoints.hasOwnProperty(t.identifier)) continue;
        var touchPointMapper = touchPoints[t.identifier];
        touchPointMapper.move(t.pageX, t.pageY);
    }
    update();
}, false);
image.addEventListener('touchend', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (!touchPoints.hasOwnProperty(t.identifier)) continue;
        var touchPointMapper = touchPoints[t.identifier];
        touchPointMapper.end();
        delete touchPoints[t.identifier];
    }
    update();
}, false);
