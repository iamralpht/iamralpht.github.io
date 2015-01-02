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

function makeClankExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var updateFunction = context.update.bind(context);

    // Clank looks a lot like the twitter panels in y, except that we have a manipulator
    // for each panel...
    var lastTab = null;

    var MIN_GAP = 5;
    var TAB_HEIGHT = 350;

    var spacing = new c.Variable({ name: 'spacing' });

    for (var i = 0; i < 3; i++) {
        var p = new Box('Tab ' + (i+1));
        // These boxes are our tabs. Give them y and bottom variables.
        p.y = new c.Variable({ name: 'tab-' + i + '-y' });
        p.bottom = new c.Variable({ name: 'tab-' + i + '-bottom' });
        p.x = 10;
        p.right = 300;
        // Make the panel 250 wide.
        solver.add(eq(p.bottom, c.plus(p.y, TAB_HEIGHT), required));

        // Pin the first panel to 0, and add a motion constraint.
        if (i == 0) {
            solver.add(eq(p.y, 0, medium, 100));
            context.addMotionConstraint(new MotionConstraint(p.y, '==', 0));
        } else {
            // Don't allow the tab to go past the end of the previous tab.
            //solver.add(leq(p.y, lastTab.bottom, medium, 1000));

            // Don't allow the tab to go before the previous tab.
            //solver.add(geq(p.y, c.plus(lastTab.y, MIN_GAP), medium, 1000));

            // Introduce a variable representing the gap between this panel and
            // the previous one.
            var gap = new c.Variable({name: 'gap-' + i});

            // Gap is defined as the gap between this tab and the previous.
            solver.add(eq(gap, c.minus(p.y, lastTab.y), required));//medium));
            solver.add(geq(gap, 5, strong));//medium));
            solver.add(leq(gap, TAB_HEIGHT/2, strong));//medium));

            // Add some motion constraints on the gap. I wonder if this will work?
            context.addMotionConstraint(new MotionConstraint(gap, '>=', 5));
            context.addMotionConstraint(new MotionConstraint(gap, '<=', TAB_HEIGHT/2));

            // The gap is also the spacing plus a slack variable. The slack
            // has a stay on it to make cassowary prefer to not move it around.
            // The slack is so that multitouch can move tabs around independently,
            // but it shouldn't move much on its own.
            //var slack = new c.Variable({name: 'gap-slack-' + i});
            //solver.add(eq(gap, c.plus(c.times(spacing, i/3), slack), strong));
            //solver.add(mediumStay(slack));
            //
            // Interesting: if we make this constraint strong then we can see how
            //              the animated edits fight against the current active
            //              touch edit. I wonder if I shouldn't weaken the animated
            //              edit strength...
            //
            // This is what's causing all of the glitchyness in this example. Maybe
            // instead we want to cancel animation edits on variables that have a
            // non-zero coefficient with a touch edit?
            solver.add(eq(gap, c.times(spacing, 1/3), medium));
            solver.add(mediumStay(gap));
            
            // Our manipulator handles the gap.
            var manip = new Manipulator(p.y, solver, updateFunction, p.element(), 'y');
            context.addManipulator(manip);
        }
        context.addBox(p);
        parentElement.appendChild(p.element());
        lastTab = p;

        // Every tab gets a manipulator (and at some point I'll add multitouch support to the
        // manipulators).
        //var manip = new Manipulator(p.y, solver, updateFunction, p.element(), 'y');
        //context.addManipulator(manip);
    }
    updateFunction();
}

makeClankExample(document.getElementById('clank-example'));
