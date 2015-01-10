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

// Photos example. Pan through horizontally to view all of the photos.

var photosModel = [
    'examples/img/5086397621_3328b13a9c_z.jpg',
    'examples/img/5086991462_c7d175b27f_z.jpg',
    'examples/img/5086396751_fb4ca9804a_z.jpg',
    'examples/img/5086992260_c37d38a6d3_z.jpg',
    'examples/img/184310605_c038be8db5_z.jpg',
    'examples/img/184314076_0b8e58fb0d_z.jpg',
];


// This example illustrates the use of animation-only motion constraints. They
// only apply during an animation and can be used to make pagers. This is a really
// simple pager because only multiples of the width+padding are valid scroll positions.
// If we allowed zooming of photos then it would be more interesting because we'd then
// have valid ranges separated by the edges of photos.
function makePhotosExample(parentElement) {
    var parentHeight = 480;
    var parentWidth = 320;

    // padding on either edge of a photo.
    var padding = 25;
    
    // Create a MotionContext and get the solver from it to add constraints to.
    var context = new MotionContext();
    var solver = context.solver();

    // Horizontal scroll position.
    var scrollPosition = new c.Variable({name: 'horizontal-scroll-position'});

    var firstPhoto = null, lastPhoto = null;
    // We're just going to make a simple row of photos (using CSS3's background-size
    // property to position them).
    for (var i = 0; i < photosModel.length; i++) {
        var p = new Box();

        p.element().style.backgroundImage = 'url(' + photosModel[i] + ')';
        // We don't need constraints for the height since it doesn't move in y.
        p.y = 0;
        p.bottom = parentHeight;
        // These are related to the scroll position, so they must be variables.
        p.x = new c.Variable({name: 'photo-' + i + '-x'});//(parentWidth + padding * 2) * i;
        p.right = new c.Variable({name: 'photo-' +i +'-right'});//p.x + parentWidth;

        // x = scrollPosition + (width * i)
        solver.add(eq(p.x, c.plus(scrollPosition, (parentWidth + padding) * i), medium));
        // right = x + width
        solver.add(eq(p.right, c.plus(p.x, parentWidth), medium));

        // Add the photo to the parent and the context.
        parentElement.appendChild(p.element());
        context.addBox(p);
        
        // Remember the first and last photos for some motion constraints.
        if (!firstPhoto) firstPhoto = p;
        lastPhoto = p;
    }

    // Motion constraint to enforce pager behavior.
    var motionConstraint = new MotionConstraint(scrollPosition, mc.adjacentModulo, parentWidth + padding);
    //motionConstraint.captive = true;
    motionConstraint.overdragCoefficient = 0;
    context.addMotionConstraint(motionConstraint);

    // Some basic motion constraints to stop us going past the ends.
    context.addMotionConstraint(new MotionConstraint(firstPhoto.x, '<=', 0));
    context.addMotionConstraint(new MotionConstraint(lastPhoto.right, '>=', parentWidth));


    // Add a manipulator to scroll through the photos.
    context.addManipulator(new Manipulator(scrollPosition, parentElement, 'x'));
}

makePhotosExample(document.getElementById('photos-example'));
