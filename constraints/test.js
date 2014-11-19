"use strict";

console.log('lo');

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
var requiredStay = function(v, w) { return stay(v, required, w||0); }


var solver = new c.SimplexSolver();
//
// Test to create the Twitter for iPad panels movement using cassowary. I want to
// have constraints that are modulo or OR, but I don't think I can do that.
// I'm not sure if I can just throw those on top or if I need some other kind of
// solver.
// Cassowary.js is pretty gnarly in places.
//
function Panel(panelName, rightOfPanel) {
    this._name = panelName;
    this._rightOf = rightOfPanel;
    this._element = document.createElement('div');
    this._element.className = 'twitter-panel';
    this._element.innerText = panelName;
 
    this.x = new c.Variable({ name: panelName + '-x' });
    if (rightOfPanel) {
        // There's a panel that we are positioned to the right of.
        // So we want to be at least 10px right of its left edge
        // But no more than 250px right of its left edge (or 0px right of its right edge?).
        solver.add(geq(this.x, c.plus(rightOfPanel.x, new c.Expression(10)), medium, 0));
        solver.add(leq(this.x, c.plus(rightOfPanel.x, new c.Expression(250)), medium, 0));
    } else {
        // We're the first panel. Pin to the left edge.
        solver.add(eq(this.x, new c.Expression(0), medium, 0));
    }
    this.update();
}
Panel.prototype.element = function() { return this._element; }
Panel.prototype.update = function() {
    var x = this.x.valueOf();
    var tx = 'translateX(' + x + 'px)';
    this._element.style.webkitTransform = tx;
    this._element.style.transform = tx;
}

var lastPanel = null;
var panels = [];
for (var i = 0; i < 5; i++) {
    var p = new Panel('Panel ' + i, lastPanel);
    lastPanel = p;
    panels.push(p);
    document.body.appendChild(p.element());
}

solver.solve();

function update() {
    for (var i = 0; i < panels.length; i++)
        panels[i].update();
}

addTouchOrMouseListener(lastPanel.element(),
{
    onTouchStart: function() {
        this._startX = lastPanel.x.valueOf();
        solver.addEditVar(lastPanel.x).beginEdit();
        update();
    },
    onTouchMove: function(dx) {
        solver.suggestValue(lastPanel.x, this._startX + dx).resolve();
        update();
    },
    onTouchEnd: function() {
        solver.endEdit();
        update();
    }

});
