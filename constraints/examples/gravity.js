"use strict";

function makeGravityExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var parentHeight = parentElement.offsetHeight;

    // Create a box to move around.
    var b = new Box('Heavy Box');
    b.y = new c.Variable({name: 'box-y'});
    b.bottom = new c.Variable({name: 'box-bottom'});

    // Fixed width and x.
    b.x = 0; 
    b.right = 300;
    
    context.addBox(b);
    parentElement.appendChild(b.element());

    // The bottom of the box is weakly positioned at the bottom of the parent. This is where it'll start.
    // b.bottom = parentHeight
    solver.add(leq(b.bottom, parentHeight, weak));
    // The y of the box is 50px above the bottom.
    // b.y = b.bottom - 50
    // (We could also write b.bottom = b.y + 50).
    solver.add(eq(b.y, c.plus(b.bottom, -50), medium));

    // Use a motion constraint to say that the bottom of the box can't go past the bottom of the parent.
    // b.bottom <= parentHeight spring
    context.addMotionConstraint(new MotionConstraint(b.bottom, '<=', parentHeight, { captive: true }));

    // Create a manipulator that uses drags in the y-axis.
    var manip = new Manipulator(b.y, parentElement, 'y');

    // Here's where we involve gravity. We say that the way this Manipulator moves when unconstrained
    // is by gravity rather than by friction. If the manipulator hits a Motion Constraint (like that
    // b.bottom <= parentHeight one we created) then it will switch to use the physics model of the
    // Motion Constraint (conserving momentum).
    manip.createMotion = function(x, v) {
        var motion = new Gravity(5000, 9999999);
        motion.set(x, v);
        return motion;
    }
    context.addManipulator(manip);
}
makeGravityExample(document.getElementById('gravity-example'));
