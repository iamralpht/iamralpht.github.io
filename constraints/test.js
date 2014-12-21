"use strict";


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


/*
 * XXX: Note while reading this that the concept of a "motion constraint" isn't
 *      abstracted fully yet; this is coming soon!
 */
// Ops for motion constraints.
var mc = {
    greater: function(a, b) { return a >= b; },
    less: function(a, b) { return a <= b; },
    equal: function(a, b) { return a == b; },
};
// This object updates all of the boxes from the constraint solver. It also tests
// all of the motion constraints and identifies which manipulator caused a motion
// constraint to be violated.
function UpdateContext(solver, boxes, motionConstraints) {
    this._solver = solver;
    this._boxes = boxes;
    this._motionConstraints = motionConstraints;
    this._manipulators = [];
}
UpdateContext.prototype.addManipulator = function(manipulator) {
    this._manipulators.push(manipulator);
}
UpdateContext.prototype.update = function() {
    this._resolveMotionConstraints();
    for (var i = 0; i < this._boxes.length; i++) {
        this._boxes[i].update();
    }
}
UpdateContext.prototype._resolveMotionConstraints = function() {
    var solver = this._solver.solver();
    function coefficient(manipulator, variable) {
        var v = manipulator.variable();
        // Iterate the edit variables in the solver. XXX: these are private and we need a real interface soon.
        var editVarInfo = solver._editVarMap.get(v);
        // No edit variable? No contribution to the current violation.
        if (!editVarInfo) return 0;
        // Now we can ask the coefficient of the edit's minus variable to the manipulator's variable. This
        // is what the solver does in suggestValue.
        var editMinus = editVarInfo.editMinus;
        // Get the expression that corresponds to the motion constraint's violated variable.
        // This is probably an "external variable" in cassowary.
        var expr = solver.rows.get(variable);
        if (!expr) return 0;
        // Finally we can compute the value.
        return expr.coefficientFor(editMinus);
    }
    for (var i = 0; i < this._motionConstraints.length; i++) {
        var pc = this._motionConstraints[i];
        if (pc.op(pc.variable.valueOf(), pc.value))
            continue;

        // Notify the manipulators that contributed to this violation.
        for (var j = 0; j < this._manipulators.length; j++) {
            var manipulator = this._manipulators[j];
            var c = coefficient(manipulator, pc.variable);

            // Do nothing if they're unrelated (i.e.: the coefficient is zero; this manipulator doesn't contribute).
            if (c == 0) continue;

            // We found a manipulator!
            manipulator.hitConstraint(pc, c);
        }
    }
}

function makeTwitterPanelsExample(parentElement) {
    var solver = new MultiEditSolver(new c.SimplexSolver());

    var lastPanel = null;
    var panels = [];
    var motionConstraints = [];

    var MIN_GAP = 10;
    var PANEL_WIDTH = 250;

    for (var i = 0; i < 5; i++) {
        var p = new Box('Panel ' + (i+1));
        // Give these boxes "x" and "right" constraints.
        p.x = new c.Variable({ name: 'panel-' + i + '-x' });
        p.right = new c.Variable({ name: 'panel-' + i + '-right' });
        p.bottom = 170;
        // Make the panel 250 wide.
        solver.add(eq(p.right, c.plus(p.x, PANEL_WIDTH), medium));

        // Pin the first panel to 0, and add a motion constraint.
        if (i == 0) {
            solver.add(eq(p.x, 0, weak, 100));
            motionConstraints.push({variable: p.x, value: 0, op: mc.equal});
        } else {
            // The panel mustn't reveal any space between it and the previous panel.
            solver.add(leq(p.x, panels[i-1].right, medium, 0));

            // Make the panel tend toward the left (zero). Use a lower priority than
            // the first panel so the solver will prefer for the first panel to be
            // zero than any of the additional panels.
            solver.add(eq(p.x, 0, weak, 0));

            // The panel must be to the right of the previous panel's left edge, plus 10.
            solver.add(geq(p.x, c.plus(panels[i-1].x, MIN_GAP), medium, 0));
        }
        panels.push(p);
        parentElement.appendChild(p.element());
        lastPanel = p;
    }

    // Make a manipulator. It takes touch events and updates a constrained variable
    // from them.

    var updateContext = new UpdateContext(solver, panels, motionConstraints);
    var updateFunction = updateContext.update.bind(updateContext);

    var manip = new Manipulable(lastPanel.x, solver, updateFunction, parentElement, 'x');
    updateContext.addManipulator(manip);
}

makeTwitterPanelsExample(document.getElementById('twitter-panels-example'));

function makeScrollingExample(parentElement, bunching) {
    var parentHeight = parentElement.offsetHeight;
    var solver = new MultiEditSolver(new c.SimplexSolver());

    var listItems = [];
    var motionConstraints = [];

    // This is the scroll position; it's the variable that the manipulator
    // changes.
    var scrollPosition = new c.Variable({name: 'scroll-position'});


    for (var i = 0; i < 10; i++) {
        var p = new Box('List Item ' + (i+1));
        // Use cassowary to layout the items in a column. Names are for debugging only.
        p.y = new c.Variable({ name: 'list-item-' + i + '-y' });
        p.bottom = new c.Variable({ name: 'list-item-' + i + '-bottom' });

        // Make items 300px wide.
        p.right = 300;

        // If we're bunching and this is the first item then let it get bigger
        // and smaller...
        if (bunching && i == 0 && false) {
            solver.add(eq(p.y, 0, weak));
            solver.add(eq(p.bottom, scrollPosition, weak, 100));
            solver.add(geq(p.bottom, c.plus(p.y, 40), medium));
            solver.add(leq(p.bottom, c.plus(p.y, 80), medium));
        } else {
            // Make the items 40px tall.
            solver.add(eq(p.bottom, c.plus(p.y, 40), medium));
        }

        // Gap of 10 between items.
        if (i > 0)
            solver.add(eq(p.y, c.plus(scrollPosition, i*50), weak, 100));
        else
            solver.add(eq(p.y, scrollPosition, weak, 100));

        // Bunching. Don't let items go off of the top or bottom.
        if (bunching) {
            // XXX: We should express these bunches in terms of
            //      the previous card, rather than as absolute offsets (i*4).
            solver.add(geq(p.y, i*3, weak, 100));
            solver.add(leq(p.bottom, parentHeight + i * 3 - 9*3, weak, 100));
        }

        listItems.push(p);
        p.element().style.zIndex = 10 - i;
        parentElement.appendChild(p.element());
    }
    // Add some constraints to the first and last item. The first item can't move
    // past the top. The last item can't move up beyond the bottom. These are
    // motion constraints enforced by springs.

    // This prefers the list to be "scrolled" to the top.
    if (!bunching) solver.add(leq(listItems[0].y, 0, weak));

    motionConstraints.push({
        variable: listItems[0].y,
        value: 0,
        op: mc.less
    });
    motionConstraints.push({
        variable: listItems[listItems.length - 1].bottom,
        value: parentHeight,
        op: mc.greater
    });

    var updateContext = new UpdateContext(solver, listItems, motionConstraints);
    var updateFunction = updateContext.update.bind(updateContext);

    var manip = new Manipulable(scrollPosition, solver, updateFunction, parentElement, 'y');
    updateContext.addManipulator(manip);
}

makeScrollingExample(document.getElementById('scrolling-example'));
makeScrollingExample(document.getElementById('android-notifications'), true);

function makeAndroidNotificationsExample(parentElement) {
    var solver = new MultiEditSolver(new c.SimplexSolver());
}
