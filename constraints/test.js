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
// Test to create the Twitter for iPad panels movement using the cassowary constraints solver.
// The goal is to have the panels collapse to mostly overlap, or fan out with each panel
// pulling the one underneath it. Crucially, though, the expand and collapse has to be symmetrical,
// and this is what I've struggled with. 
//
function Panel(panelName, rightOfPanel, i, useRelativeLeftEdgeConstraint) {
    this._name = panelName;
    this._rightOf = rightOfPanel;
    this._element = document.createElement('div');
    this._element.className = 'twitter-panel';
    this._element.innerText = panelName;
 
    this.x = new c.Variable({ name: panelName + '-x' });
    this.right = c.plus(this.x, 250);

    if (rightOfPanel) {
        // There's a panel that we are positioned to the right of.
        // So we want to be at least 10px right of its left edge
        // But no more than 250px right of its left edge (or 0px right of its right edge?).

        solver.add(leq(this.x, rightOfPanel.right, weak, 0));
        // What's going on here? If I make the constraint relative to the right-of panel
        // then the panels expand and contract in an unpleasing order (asymmetrically).
        // If I make it an absolute constraint then it works OK...
        //
        // What I want to do is say: minimize this value respecting the constraints and
        // whatever stays are set.

        if (useRelativeLeftEdgeConstraint)
            solver.add(geq(this.x, c.plus(rightOfPanel.x, new c.Expression(10)), weak, 0));
        else
            solver.add(geq(this.x, i * 10, weak, 0));

        // Failed experiment to try to express what I wanted as a constraint on the gap
        // between a panel and its predecessors:

        // This is pretty weird. Make sure that the gap between us and the panel next to us
        // is bigger than the gap it has.
        //this.gap = c.minus(this.x, rightOfPanel.x);
        //solver.add(geq(this.gap, rightOfPanel.gap, strong, 0));
    } else {
        // We're the first panel. Pin to the left edge.
        solver.add(eq(this.x, new c.Expression(0), weak, 0));
        this.gap = new c.Expression(0);
    }
    this.update();
}
Panel.prototype.element = function() { return this._element; }
Panel.prototype.update = function() {
    var x = this.x.valueOf();
    var tx = 'translateX(' + x + 'px) translate3D(10px, 10px, 0)'; // hacky inset.
    this._element.style.webkitTransform = tx;
    this._element.style.transform = tx;
}

function makePanelsExample(parentElement, useRelativeLeftEdgeConstraint) {
    var lastPanel = null;
    var panels = [];
    for (var i = 0; i < 5; i++) {
        var p = new Panel('Panel ' + i, lastPanel, i, useRelativeLeftEdgeConstraint);
        lastPanel = p;
        panels.push(p);
        parentElement.appendChild(p.element());
    }

    solver.add(weakStay(lastPanel.x));

    solver.solve();

    function update() {
        for (var i = 0; i < panels.length; i++)
            panels[i].update();
    }

    addTouchOrMouseListener(lastPanel.element(),
    {
        onTouchStart: function() {
            this._startX = lastPanel.x.valueOf();
            solver.addEditVar(lastPanel.x, medium).beginEdit();
            update();
        },
        onTouchMove: function(dx) {
            solver.suggestValue(lastPanel.x, this._startX + dx).resolve();
            update();
        },
        onTouchEnd: function() {
            solver.endEdit();
            solver.resolve();
            update();
        }
    });
}

function makeExample(text, useRelativeLeftEdgeConstraint) {
    var exampleParent = document.createElement('div');
    exampleParent.className = 'cards-parent';
    exampleParent.textContent = text;
    var container = document.createElement('div');
    container.className = 'cards-container';
    exampleParent.appendChild(container);
    makePanelsExample(container, useRelativeLeftEdgeConstraint);

    document.body.appendChild(exampleParent);
}

makeExample('Drag on Panel 4. The left edge of each panel is constrained to be greater than i * 10. The panels expand and collapse as I want, where opening Panel 4 reveals Panel 3, and they collapse in the same order.', false);
makeExample("Here the left edge of each panel is constrained to be greater than the left edge of the previous panel, plus 10 (the first panel's left edge is constrained to equal 0). Notice how Panel 1 is revealed first. I want to express that the x of each panel should be minimized (respecting the constraints and stays), but I don't know how to do that.", true);

