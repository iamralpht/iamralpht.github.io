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

// Windows 7-style window-based overscrolling
function makeWindows7Overscroll(parentElement) {
    var parentHeight = 550;
    var windowWidth = 470;
    var windowHeight = 427;

    var contentWidth = 450;//427;
    var contentHeight = (640/427) * 450;

    var windowTop = (parentHeight - windowHeight) / 2;

    var contentArea = { x: 10, y: 47, width: 450, height: 370 };

    var context = new MotionContext();
    var solver = context.solver();

    var win = new Box(parentElement.querySelector('.window'));
    var clip = new Box(parentElement.querySelector('.clip'));
    var content = new Box(parentElement.querySelector('.image'));

    context.addBox(win);

    win.addChild(clip);
    clip.addChild(content);

    // Describe the window size. This can't change (in this example) so we use
    // strong constraints. If I was using border-image or something for the window
    // boundary then I *could* make it resizable, which would be pretty awesome.
    win.x = 0;
    win.right = windowWidth;
    win.y = new c.Variable();
    win.bottom = new c.Variable();
    var winHeight = c.minus(win.bottom, win.y);

    solver.add(eq(winHeight, windowHeight, strong));
    solver.add(eq(win.y, windowTop, weak));

    // Position the clip. This is just so that the content doesn't draw all over
    // the window border.
    clip.x = contentArea.x; clip.right = contentArea.x + contentArea.width;
    clip.y = new c.Variable();
    clip.bottom = new c.Variable();

    // The clip is glued to the window.
    solver.add(eq(clip.y, c.plus(win.y, contentArea.y), strong));
    solver.add(eq(clip.bottom, c.plus(win.y, contentArea.y + contentArea.height), strong));

    content.x = contentArea.x; content.right = contentArea.x + contentWidth;
    content.y = new c.Variable(); content.bottom = new c.Variable();

    // The content is always the same height.
    solver.add(eq(content.bottom, c.plus(content.y, contentHeight), strong));
    // Constrain the content to be inside the window -- this means that in order to overdrag
    // the image, we'll have to move the whole window since its position is only weakly
    // constrained.
    solver.add(leq(content.y, clip.y, strong));
    solver.add(geq(content.bottom, clip.bottom, strong));

    // Motion constraints are really simple. We just want the window to stay put, enforced by a spring...
    context.addMotionConstraint(new MotionConstraint(win.y, '==', windowTop, { physicsModel: MotionConstraint.criticallyDamped }));

    // Manipulate the content's y.
    context.addManipulator(new Manipulator(content.y, parentElement, 'y'));

    context.update();
}

makeWindows7Overscroll(document.getElementById('win7-overscroll-example'));
