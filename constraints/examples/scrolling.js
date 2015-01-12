"use strict";

function makeScrollingExample(parentElement, bunching) {
    var parentHeight = parentElement.offsetHeight;
    var context = new MotionContext();
    var solver = context.solver();

    // This is the scroll position; it's the variable that the manipulator
    // changes.
    var scrollPosition = new c.Variable({name: 'scroll-position'});

    var N = 10;
    // Remeber the first box and last box for motion constraints.
    var firstBox, lastBox;

    for (var i = 0; i < N; i++) {
        var p = new Box('List Item ' + (i+1));

        // Use cassowary to layout the items in a column. Names are for debugging only.
        p.y = new c.Variable({ name: 'list-item-' + i + '-y' });
        p.bottom = new c.Variable({ name: 'list-item-' + i + '-bottom' });

        // Make items 300px wide.
        p.x = 5;
        p.right = 295;

        // Make the items 40px tall.
        solver.add(eq(p.bottom, c.plus(p.y, 40), medium));

        // Gap of 10 between items.
        if (i > 0) // p.y = scrollPosition + i * 50
            solver.add(eq(p.y, c.plus(scrollPosition, i*50), weak, 100));
        else // p.y = scrollPosition
            solver.add(eq(p.y, scrollPosition, weak, 100));

        // Bunching. Don't let items go off of the top or bottom.
        if (bunching) {
            // We cause the boxes to stack rather than completely overlap by
            // specifying these constraints which keep them on the screen.


            // box[i].y >= box[i-1].y + 3
            if (lastBox) solver.add(geq(p.y, c.plus(lastBox.y, 3), medium));
            // box[first].y >= 0
            else solver.add(geq(p.y, 0, medium));

            // box[i].y <= box[i+1].y - 3
            if (lastBox) solver.add(leq(c.minus(lastBox.y, 3), p.y, medium));
            // box[last].bottom <= parentHeight
            if (i == N-1) solver.add(leq(lastBox.bottom, parentHeight, medium));
        }

        context.addBox(p);
        // Use z-index so that the boxes visually stack the way we want
        // (which is actually opposite to DOM order).
        p.element().style.zIndex = N - i;
        parentElement.appendChild(p.element());

        // Remember the first and last boxes.
        if (!firstBox) firstBox = p;
        lastBox = p;
    }

    // This prefers the list to be "scrolled" to the top.
    if (!bunching) solver.add(leq(firstBox.y, 0, weak));

    // Add some constraints to the first and last item. The first item can't move
    // past the top. The last item can't move up beyond the bottom. These are
    // motion constraints enforced by springs.

    // firstBox.y <= 0 with a critically damped spring.
    context.addMotionConstraint(
        new MotionConstraint(firstBox.y, '<=', 0, { physicsModel: MotionConstraint.criticallyDamped }));

    // lastBox.bottom >= parentHeight with a critically damped spring.
    context.addMotionConstraint(
        new MotionConstraint(lastBox.bottom, '>=', parentHeight, { physicsModel: MotionConstraint.criticallyDamped }));

    // Drags in "y" on the parentElement will adjust the variable scrollPosition.
    context.addManipulator(new Manipulator(scrollPosition, parentElement, 'y'));
}

makeScrollingExample(document.getElementById('scrolling-example'));
makeScrollingExample(document.getElementById('android-notifications'), true);
