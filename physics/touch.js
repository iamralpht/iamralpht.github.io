'use strict';

/*
Copyright 2014 Ralph Thomas

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

(function() {
// List of all listeners; dom element and listener object.
var listeners = {};
var listenerSequence = 0;
var registeredGlobalListener = false;

function addListener(domObject, listener) {
    var key = 'touch-listener-' + (listenerSequence++);
    listeners[key] = listener;
    domObject.listenerKey = key;
}
function findListener(domObject) {
    if (domObject && domObject.listenerKey && listeners.hasOwnProperty(domObject.listenerKey)) {
        return listeners[domObject.listenerKey];
    }
    return null;
}
function registerGlobalListener() {
    if (registeredGlobalListener) return;
    registeredGlobalListener = true;

    var touchInfo = { trackingID: -1, maxDy: 0, maxDx: 0 };
    function touchStart(e) {
        if (touchInfo.trackingID != -1) return;
        var listener = findListener(e.target);
        if (!listener) return;

        e.preventDefault();
        if (e.type == 'touchstart') {
            touchInfo.trackingID = e.changedTouches[0].identifier;
            touchInfo.x = e.changedTouches[0].pageX;
            touchInfo.y = e.changedTouches[0].pageY;
        } else {
            touchInfo.trackingID = 'mouse';
            touchInfo.x = e.screenX;
            touchInfo.y = e.screenY;
        }
        touchInfo.maxDx = 0;
        touchInfo.maxDy = 0;
        touchInfo.historyX = [0];
        touchInfo.historyY = [0];
        touchInfo.historyTime = [e.timeStamp];
        touchInfo.listener = listener;

        if (listener.onTouchStart)
            listener.onTouchStart();
    }

    function findDelta(e) {
        if (e.type == 'touchmove' || e.type == 'touchend') {
            for (var i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier == touchInfo.trackingID) {
                    return {x: e.changedTouches[i].pageX - touchInfo.x, y: e.changedTouches[i].pageY - touchInfo.y};
                }
            }
        } else {
            return {x: e.screenX - touchInfo.x, y: e.screenY - touchInfo.y};
        }
        return null;
    }

    function touchMove(e) {
        if (touchInfo.trackingID == -1) return;
        e.preventDefault();
        var delta = findDelta(e);
        if (!delta) return;
        touchInfo.maxDy = Math.max(touchInfo.maxDy, Math.abs(delta.y));
        touchInfo.maxDx = Math.max(touchInfo.maxDx, Math.abs(delta.x));

        // This is all for our crummy velocity computation method. We really
        // should do least squares or anything at all better than just taking
        // the difference between two random samples.
        touchInfo.historyX.push(delta.x);
        touchInfo.historyY.push(delta.y);
        touchInfo.historyTime.push(e.timeStamp);
        while (touchInfo.historyTime.length > 10) {
            touchInfo.historyTime.shift();
            touchInfo.historyX.shift();
            touchInfo.historyY.shift();
        }

        if (touchInfo.listener && touchInfo.listener.onTouchMove)
            touchInfo.listener.onTouchMove(delta.x, delta.y, e.timeStamp);
    }

    function touchEnd(e) {
        if (touchInfo.trackingID == -1) return;
        e.preventDefault();
        var delta = findDelta(e);
        if (!delta) return;

        var listener = touchInfo.listener;
        touchInfo.trackingID = -1;
        touchInfo.listener = null;

        // Compute velocity in the most atrocious way. Walk backwards until we find a sample that's 30ms away from
        // our initial sample. If the samples are too distant (nothing between 30 and 50ms away then blow it off
        // and declare zero velocity. Same if there are no samples.
        var sampleCount = touchInfo.historyTime.length;
        var velocity = { x: 0, y: 0 };
        if (sampleCount > 2) {
            var idx = touchInfo.historyTime.length - 1;
            var lastTime = touchInfo.historyTime[idx];
            var lastX = touchInfo.historyX[idx];
            var lastY = touchInfo.historyY[idx];
            var found = false;
            while (idx > 0) {
                idx--;
                var t = touchInfo.historyTime[idx];
                var dt = lastTime - t;
                if (dt > 30 && dt < 50) {
                    // Ok, go with this one.
                    velocity.x = (lastX - touchInfo.historyX[idx]) / (dt / 1000);
                    velocity.y = (lastY - touchInfo.historyY[idx]) / (dt / 1000);
                    break;
                }
            }
        }
        touchInfo.historyTime = [];
        touchInfo.historyX = [];
        touchInfo.historyY = [];

        if (listener && listener.onTouchEnd)
            listener.onTouchEnd(delta.x, delta.y, velocity);
    }

    document.body.addEventListener('touchstart', touchStart, false);
    document.body.addEventListener('touchmove', touchMove, false);
    document.body.addEventListener('touchend', touchEnd, false);
    document.body.addEventListener('mousedown', touchStart, false);
    document.body.addEventListener('mousemove', touchMove, false);
    document.body.addEventListener('mouseup', touchEnd, false);
}

//
// This is a utility to normalize single-point touch events and mouse
// events and implement very simple velocity tracking on top. To do
// mouse we *must* install a global handler (otherwise you can quickly
// drag the mouse out of the object you're dragging and you lose the
// event stream), so just for symmetry we do the same with touch events.
//
// If I was writing a bigger app then I'd hope it was touch only and
// would register touch handlers directly on the objects that need them
// (although typically you have to do some global event handling anyway...).
//
// The `listener` object should implement `onTouchStart`, `onTouchMove` and
// `onTouchEnd` methods.
//
function addTouchOrMouseListener(element, listener) {
    registerGlobalListener();
    addListener(element, listener);
}


window.addTouchOrMouseListener = addTouchOrMouseListener;
})();
