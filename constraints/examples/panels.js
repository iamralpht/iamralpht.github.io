"use strict";

function makeTwitterPanelsExample(parentElement, constrain) {
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
            context.addMotionConstraint(new MotionConstraint(p.x, '==', 0));
        } else {
            // The panel mustn't reveal any space between it and the previous panel.
            solver.add(leq(p.x, panels[i-1].right, medium, 0));

            // Make the panel tend toward the left (zero). Use a lower priority than
            // the first panel so the solver will prefer for the first panel to be
            // zero than any of the additional panels.
            solver.add(eq(p.x, 0, weak, 0));

            // The panel must be to the right of the previous panel's left edge, plus 10.
            solver.add(geq(p.x, c.plus(panels[i-1].x, MIN_GAP), medium, 0));

            // If we're supposed to constrain to either a panel being completely exposed
            // or completely collapsed then we do that here.
            if (constrain) {
                // We constrain on the gap between this panel and the one that came before
                // it. So first, create a variable that will be the gap to constrain on.
                var gap = new c.Variable();

                // gap = panel[i].x - panel[i-1].x
                solver.add(eq(gap, c.minus(p.x, panels[i-1].x)));

                // Use the OR operator for the motion constraint. Eiher the gap is MIN_GAP
                // or it should be PANEL_WIDTH.
                // This constraint is captive (it will be enforced even if we'd go through it)
                // This constraint isn't active when dragging (overdragCoefficient: 0)
                context.addMotionConstraint(new MotionConstraint(gap, '||', [MIN_GAP, PANEL_WIDTH], { overdragCoefficient: 0, captive: true }));
            }
        }
        panels.push(p);
        context.addBox(p);
        parentElement.appendChild(p.element());
        lastPanel = p;
    }

    // Make a manipulator. It takes touch events and updates a constrained variable
    // from them.

    var manip = new Manipulator(lastPanel.x, parentElement, 'x');
    context.addManipulator(manip);
}

makeTwitterPanelsExample(document.getElementById('twitter-panels-example'), false);
makeTwitterPanelsExample(document.getElementById('twitter-panels-example-constrain'), true);

