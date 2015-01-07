'use strict';

/*
Copyright 2015 Ralph Thomas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// iOS control center example.
function makeControlCenter(parentElement) {
    // Use an iPhone 5 resolution, since the control center asset is really tall.
    var parentWidth = 320;
    var parentHeight = 568;

    var controlCenterHeight = 428;

    var context = new MotionContext();
    var solver = context.solver();

    var backdrop = new Box(parentElement.querySelector('.backdrop'));
    var controlCenter = new Box(parentElement.querySelector('.control-center'));

    context.addBox(backdrop);
    context.addBox(controlCenter);

    backdrop.x = 0;
    backdrop.y = 0;
    backdrop.right = parentWidth;
    backdrop.bottom = parentHeight;

    controlCenter.x = 0;
    controlCenter.right = parentWidth;
    controlCenter.y = new c.Variable({name: 'control-center-y'});
    controlCenter.bottom = new c.Variable({name: 'control-center-bottom'});
    
    // Make the control center the right height; make it a bit taller actually so when it's
    // exposed by overdragging we don't show the desktop underneath.
    solver.add(eq(controlCenter.bottom, c.plus(controlCenter.y, controlCenterHeight + 100), medium));
    // Move the control center to be offscreen to start with.
    solver.add(eq(controlCenter.y, parentHeight, weak));

    // Introduce a variable to make the motion constraints easier to specify.
    var offset = new c.Variable({name: 'control-center-offset'});
    solver.add(eq(controlCenter.y, c.plus(parentHeight, offset), medium));


    // Add some constraints on the control center. It's basically a vertical pager with two elements
    // (one visible and one invisible), so we can model it using the modulo operator.

    context.addMotionConstraint(new MotionConstraint(offset, mc.adjacentModulo, controlCenterHeight,
        { overdragCoefficient: 0, captive: true }));
    context.addMotionConstraint(new MotionConstraint(offset, '<=', 0));
    context.addMotionConstraint(new MotionConstraint(offset, '>=', -controlCenterHeight));

    // Add a manipulator to the control center's y.
    context.addManipulator(new Manipulator(controlCenter.y, solver, context.update.bind(context), parentElement, 'y'));
}

makeControlCenter(document.getElementById('ios-example'));
