"use strict";

function makeDemo(parentElement, includeManipulator, includeMotionConstraints) {
    var parentWidth = 180;
    var parentHeight = 250;
    var photoWidth = 640;
    var photoHeight = 427;

    var scaledPhotoWidth = (parentHeight / photoHeight) * photoWidth;

    // Create a MotionContext; this object creates the solver and enforces motion constraints.
    var context = new MotionContext();
    var solver = context.solver();

    var photo = new Box('');
    context.addBox(photo);
    parentElement.appendChild(photo.element());

    // We're going to position our box statically vertically; it doesn't move in y.
    photo.y = 0;
    photo.bottom = parentHeight;

    // The photo can move in X, so we use Cassowary.js variables for "x" and "right".
    photo.x = new c.Variable();
    photo.right = new c.Variable();

    // Now we can express the photo's width using a linear constraint.

    // photo.right = photo.x + scaledPhotoWidth
    solver.add(eq(photo.right, c.plus(photo.x, scaledPhotoWidth)));

    // For the second part of the example, we add a Manipulator.
    if (includeManipulator) {
        // Drags in x on the parentElement will change the photo's x coordinate.
        context.addManipulator(new Manipulator(photo.x, parentElement, 'x'));
    }

    // For the third part of the example, we add two motion constraints.
    if (includeMotionConstraints) {
        // The left edge of the photo can't go to the right of the parent's left edge (which is zero),
        // enforced by a spring.
        //  photo.x <= 0 spring
        context.addMotionConstraint(new MotionConstraint(photo.x, '<=', 0, { physicsModel: MotionConstraint.criticallyDamped }));
        // The right edge of the photo can't go to the left of the parent's right edge (which is parentWidth),
        // enforced by a spring.
        //  photo.right >= parentWidth spring
        context.addMotionConstraint(new MotionConstraint(photo.right, '>=', parentWidth, { physicsModel: MotionConstraint.criticallyDamped }));
    }

    context.update();
}

makeDemo(document.getElementById('demo-example-1'), false, false);
makeDemo(document.getElementById('demo-example-2'), true, false);
makeDemo(document.getElementById('demo-example-3'), true, true);
