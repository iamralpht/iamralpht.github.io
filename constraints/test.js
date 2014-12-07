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
function Panel(panelName, rightOfPanel, i, useRelativeLeftEdgeConstraint, physicsConstraints) {
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

        solver.add(leq(this.x, rightOfPanel.right, medium, 0));
        // What's going on here? If I make the constraint relative to the right-of panel
        // then the panels expand and contract in an unpleasing order (asymmetrically).
        // If I make it an absolute constraint then it works OK...
        //
        // What I want to do is say: minimize this value respecting the constraints and
        // whatever stays are set.

        if (useRelativeLeftEdgeConstraint) {
            solver.add(eq(this.x, 0, weak));
            solver.add(geq(this.x, c.plus(rightOfPanel.x, new c.Expression(10)), medium));
        } else
            solver.add(geq(this.x, i * 10, medium, 0));

        // Failed experiment to try to express what I wanted as a constraint on the gap
        // between a panel and its predecessors:

        // This is pretty weird. Make sure that the gap between us and the panel next to us
        // is bigger than the gap it has.
        //this.gap = c.minus(this.x, rightOfPanel.x);
        //solver.add(geq(this.gap, rightOfPanel.gap, strong, 0));
    } else {
        // We're the first panel. Pin to the left edge.
        // Note that weird things happen when collapsing using relative constraints if the priority is zero...
        //  XXX: Need to understand what the priority means? Is it just which constraint is relaxed first?
        solver.add(eq(this.x, new c.Expression(0), weak, 100));
        if (physicsConstraints) {
            physicsConstraints.push({ variable: this.x, value: 0 });
        }
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

function ConstrainedFriction() {
    this._model = null;
}
ConstrainedFriction.prototype.set = function(x, v) {
    this._model = new Friction(0.001);
    this._model.set(x, v);
    this._constrained = false;
}
ConstrainedFriction.prototype.hitConstraint = function(value) {
    if (this._constrained) return;
    // Only handle hitting one constraint at a time.
    this._constrained = true;
    // We really need to know the relationship between the constrained value and our
    // value. I wonder how we can get that expression?
    var x = this._model.x();
    var delta = this._model.x() - value;
    var velocity = this._model.dx();

    this._model = new Spring(1, 200, 20);
    this._model.snap(x);
    this._model.setEnd(delta, velocity);
}
ConstrainedFriction.prototype.done = function() { return this._model.done(); }
ConstrainedFriction.prototype.x = function() { return this._model.x(); }
ConstrainedFriction.prototype.dx = function() { return this._model.dx(); }

function makePanelsExample(parentElement, useRelativeLeftEdgeConstraint) {
    var lastPanel = null;
    var panels = [];
    var physicsConstraints = [];
    for (var i = 0; i < 5; i++) {
        var p = new Panel(i + ' Panel ' + i, lastPanel, i, useRelativeLeftEdgeConstraint, physicsConstraints);
        lastPanel = p;
        panels.push(p);
        parentElement.appendChild(p.element());
    }

    solver.add(mediumStay(lastPanel.x));
    solver.solve();

    var motion = null;
    var anim = null;

    function resolvePhysics() {
        for (var i = 0; i < physicsConstraints.length; i++) {
            var pc = physicsConstraints[i];
            if (pc.variable.valueOf() == pc.value)
                continue;

            //console.log('variable: ' + pc.variable.valueOf() + ' val: ' + pc.value);
            //console.log('physics violation');
            if (motion) motion.hitConstraint(pc.variable.valueOf() - pc.value);
        }
    }

    function update() {
        resolvePhysics();
        for (var i = 0; i < panels.length; i++)
            panels[i].update();
    }

    addTouchOrMouseListener(lastPanel.element(),
    {
        onTouchStart: function() {
            if (anim) {
                anim.cancel();
                solver.endEdit();
                solver.resolve();
                anim = null;
                motion = null;
            }
            this._startX = lastPanel.x.valueOf();
            solver.addEditVar(lastPanel.x, strong).beginEdit();
            update();
        },
        onTouchMove: function(dx) {
            solver.suggestValue(lastPanel.x, this._startX + dx).resolve();
            update();
        },
        onTouchEnd: function(dx, dy, v) {
            // Instead of ending here, create a friction animation.
            motion = new ConstrainedFriction(0.001);
            motion.set(this._startX + dx, v.x);
            anim = animation(motion, function() {
                var x = motion.x();
                solver.suggestValue(lastPanel.x, x).resolve();
                update();
                if (motion.done()) {
                    solver.endEdit();
                    solver.resolve();
                    update();
                    anim = null;
                    motion = null;
                }
            });
            //solver.endEdit();
            //solver.resolve();
            //update();
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
makeExample("Here the panel constraints are in terms of the previous panel, so panel[i].left > panel[i-1].left + 10 && panel[i].left < panel[i-1].right. We also say that panel.left == 0 with a weak strength (the first panel's constraint that pins x to 0 has a higher priority than the other panels, meaning that the panels will fully collapse before the first panel travels further left). Thanks to Greg Badros for setting me straight. This is now the correct behavior, except for not having snap points when you release...", true);

