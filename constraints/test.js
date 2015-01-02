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

function makeTwitterPanelsExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var lastPanel = null;
    var panels = [];

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
            context.addMotionConstraint(new MotionConstraint(p.x, '==', 0));//{variable: p.x, value: 0, op: mc.equal});
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
        context.addBox(p);
        parentElement.appendChild(p.element());
        lastPanel = p;
    }

    // Make a manipulator. It takes touch events and updates a constrained variable
    // from them.

    var updateFunction = context.update.bind(context);

    var manip = new Manipulator(lastPanel.x, solver, updateFunction, parentElement, 'x');
    context.addManipulator(manip);
}

makeTwitterPanelsExample(document.getElementById('twitter-panels-example'));

function makeScrollingExample(parentElement, bunching) {
    var parentHeight = parentElement.offsetHeight;
    var context = new MotionContext();
    var solver = context.solver();

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

        context.addBox(p);
        p.element().style.zIndex = 10 - i;
        parentElement.appendChild(p.element());
    }
    // Add some constraints to the first and last item. The first item can't move
    // past the top. The last item can't move up beyond the bottom. These are
    // motion constraints enforced by springs.


    var boxes = context.boxes();
    var firstBox = boxes[0];
    var lastBox = boxes[boxes.length - 1];
    // This prefers the list to be "scrolled" to the top.
    if (!bunching) solver.add(leq(firstBox.y, 0, weak));

    context.addMotionConstraint(
        new MotionConstraint(firstBox.y, '<=', 0));
    context.addMotionConstraint(
        new MotionConstraint(lastBox.bottom, '>=', parentHeight));

    var updateFunction = context.update.bind(context);

    var manip = new Manipulator(scrollPosition, solver, updateFunction, parentElement, 'y');
    context.addManipulator(manip);
}

makeScrollingExample(document.getElementById('scrolling-example'));
makeScrollingExample(document.getElementById('android-notifications'), true);

function makeGravityExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var parentHeight = parentElement.offsetHeight;

    var b = new Box('Drag Up');
    b.y = new c.Variable({name: 'box-y'});
    b.bottom = new c.Variable({name: 'box-bottom'});
    b.x = 0; 
    b.right = 200;
    
    context.addBox(b);

    parentElement.appendChild(b.element());

    solver.add(leq(b.bottom, parentHeight, weak));
    solver.add(eq(b.y, c.plus(b.bottom, -50), medium));

    context.addMotionConstraint(new MotionConstraint(b.bottom, '<=', parentHeight));

    var manip = new Manipulator(b.y, solver, context.update.bind(context), parentElement, 'y');
    manip.createMotion = function(x, v) {
        var motion = new Gravity(5000, 9999999);
        motion.set(x, v);
        return motion;
    }
    context.addManipulator(manip);
}

makeGravityExample(document.getElementById('gravity-example'));

function makePagerExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var scrollPosition = new c.Variable({name: 'scroll-position'});
    for (var i = 0; i < 10; i++) {
        // Constraints aren't the point of this test, so just statically lay
        // the boxes out and set a motion constraint.
        var b = new Box('Box ' + (i+1));
        b.x = new c.Variable();
        b.right = new c.Variable();
        b.y = 20;
        b.bottom = 220;

        solver.add(eq(b.x, c.plus(i * 200, scrollPosition), medium));
        solver.add(eq(b.right, c.plus(b.x, 200), medium));

        context.addBox(b);
        parentElement.appendChild(b.element());
    }
    // Go to the nearest multiple of 200.
    var motionConstraint = new MotionConstraint(scrollPosition,
        function(a, b, isFromAnimation, velocity) {
            if (a > 0) return -a;
            if (a < -b * 10) return a + b*10;
            if (isFromAnimation) {
                // Find the nearest multiple of b. Need to incorporate velocity
                // and things in here too. This is pretty non-physical currently :(.
                // XXX: Come up with a better equation based on the distance that
                //      would be travelled using a friction equation or something
                //      like that.
                var ceil = Math.ceil(a/b);
                var floor = Math.floor(a/b);

                var nearest = b * Math.round(a/b);

                if (velocity !== undefined)
                    nearest = (velocity > 0) ? (b * ceil) : (b * floor);

                return nearest - a;
            }
            return 0;
        }, 200);
    // XXX: Hackery; the constraint should decide if it applies or not.
    motionConstraint.captive = true;
    context.addMotionConstraint(motionConstraint);

    var manip = new Manipulator(scrollPosition, solver, context.update.bind(context), parentElement, 'x');
    context.addManipulator(manip);
}

makePagerExample(document.getElementById('pager-example'));

