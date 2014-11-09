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

// This function sets up a requestAnimationFrame-based timer which calls
// the callback every frame while the physics model is still moving.
// It returns a function that may be called to cancel the animation.
function animation(physicsModel, callback) {
    
    function onFrame(handle, model, cb) {
        cb(model);
        if (!physicsModel.done()) {
            handle.id = requestAnimationFrame(onFrame.bind(null, handle, model, cb));
        }
    }
    function cancel(handle) {
        if (handle && handle.id)
            cancelAnimationFrame(handle.id);
    }

    var handle = {};
    onFrame(handle, physicsModel, callback);

    return { cancel: cancel.bind(null, handle) };
}
