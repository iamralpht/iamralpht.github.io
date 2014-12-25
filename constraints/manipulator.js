"use strict";

var manipulatorCount = 0;

// This is a wrapper over a cassowary variable. It will create an edit session
// for it when dragged and listen for violations of motion constraints.
function Manipulator(variable, solver, update, domObject, axis) {
    this._variable = variable;
    this._solver = solver;
    this._axis = axis;
    this._updateSystem = update;

    this._motion = null;
    this._animation = null;
    this._name = 'manipulator-' + variable.name + '-' + (++manipulatorCount);

    this._hitConstraint = null;
    this._constraintCoefficient = 1;

    var self = this;

    // There are three places that a variable gets a value from in here:
    //  1. touch manipulation (need to apply constraint when in violation)
    //  2. animation from velocity.
    //  3. animation from constraint.
    this._motionState = {
        editing: false,
        // Manipulation from touch
        dragging: false,
        dragStart: 0,
        dragDelta: 0,
        // Animation from velocity (which the finger imparted)
        velocityAnimation: null,
        velocityAnimationPosition: 0,
        velocityAnimationVelocity: 0,
        // Animation from constraint (either from velocity animation, or from drag end).
        constraintAnimation: null,
        constraintAnimationPosition: 0,
        constraintAnimationVelocity: 0
    };

    // Clean up:
    // There are three places that a variable gets a value from in here:
    //  1. touch manipulation (need to apply constraint when in violation)
    //  2. animation from velocity.
    //  3. animation from constraint.
    // Currently those three are all kind of mixed up; it might be better
    // to have them all provide updates and then select which value we're
    // going to use and whether it needs to be constrained or already has
    // been.

    addTouchOrMouseListener(domObject, {
        onTouchStart: function() {
            // Start a new edit session.
            self._motionState.dragging = true;
            self._motionState.dragStart = variable.valueOf();
            self._motionState.dragDelta = 0;
            self._update();
        },
        onTouchMove: function(dx, dy) {
            var delta = (axis == 'x') ? dx : dy;
            self._motionState.dragDelta = delta;
            self._update();
        },
        onTouchEnd: function(dx, dy, v) {
            var velocity = (axis == 'x') ? v.x : v.y;
            self._motionState.dragging = false;
            // No velocity, just end the drag and we'll run a constraining animation
            // if needed.
            if (velocity == 0 && !self._hitConstraint) {
                self._update();
                return;
            }
            self._createAnimation(velocity);
        }
    });

    // Add a stay to the variable we're going to manipulate.
    solver.add(new c.StayConstraint(variable, c.Strength.medium, 0));
    solver.solve();
    update(this);
}
Manipulator.prototype.name = function() { return this._name; }
Manipulator.prototype.variable = function() { return this._variable; }
Manipulator.prototype.createMotion = function(x, v) {
    var m = new Friction(0.001);
    m.set(x, v);
    return m;
}
Manipulator.prototype._cancelAnimation = function(key) {
    if (!this._motionState[key]) return;
    this._motionState[key].cancel();
    this._motionState[key] = null;
}
Manipulator.prototype._update = function() {
    // What state are we in?
    //  1. Dragging -- we set the variable to the value specified and apply some
    //     damping if we're in violation of a constraint.
    //  2. Animating -- we have some momentum from a drag, and we're applying the
    //     values of an animation to the variable. We need to react if we violate
    //     a constraint.
    //  3. Constraint animating -- we already violated a constraint and now we're
    //     animating back to a non-violating position.
    //  4. Nothing is going on, we shouldn't be editing.
    //
    var self = this;
    function beginEdit() {
        if (self._motionState.editing) return;
        self._solver.beginEdit(self._variable, c.Strength.strong);
        self._motionState.editing = true;
    }

    if (this._motionState.dragging) {
        // 1. Dragging.

        // Kill any animations we already have.
        this._cancelAnimation('velocityAnimation');
        this._cancelAnimation('constraintAnimation');
        // Start an edit.
        beginEdit();
        // If we've hit any constraint then apply that.
        var position = this._motionState.dragStart + this._motionState.dragDelta;
        if (this._hitConstraint) {
            var violationDelta = this._hitConstraint.op(this._hitConstraint.variable.valueOf(), this._hitConstraint.value);
            violationDelta *= 1 - this._constraintCoefficient;
            position = this._motionState.dragStart + this._motionState.dragDelta * 0.5 * this._constraintCoefficient;
        }
        // Now tell the solver.
        this._solver.suggestValue(this._variable, position);
    } else if (this._motionState.constraintAnimation) {
        this._cancelAnimation('velocityAnimation');
        beginEdit();
        var position = this._motionState.constraintAnimationPosition;
        this._solver.suggestValue(this._variable, position);
    } else if (this._motionState.velocityAnimation) {
        beginEdit();
        var position = this._motionState.velocityAnimationPosition;
        // We don't consider constraints here; we deal with them in didHitConstraint.
        this._solver.suggestValue(this._variable, position);
    } else {
        // We're not doing anything; end the edit.
        if (!this._motionState.editing) return;
        this._solver.endEdit(this._variable);
        this._motionState.editing = false;
    }
    this._updateSystem();
}
Manipulator.prototype._createAnimation = function(velocity) {
    // Can't animate if we're being dragged.
    if (this._motionState.dragging) return;

    this._cancelAnimation('velocityAnimation');
    this._cancelAnimation('constraintAnimation');
    var self = this;

    // Create an animation from where we are. This is either just a regular motion or we're
    // violating a constraint and we need to animate out of violation.
    if (this._hitConstraint) {
        // XXX: Currently we always use a spring to animate us back, but this should come
        //      from the violated motion constraint instead of being hardcoded.

        // Figure out how far we have to go to be out of violation. Because we use a linear
        // constraint solver to surface violations we only need to remember the coefficient
        // of a given violation.
        var violationDelta =
            this._hitConstraint.op(this._hitConstraint.variable.valueOf(), this._hitConstraint.value) *
            this._constraintCoefficient;

        var velocity = self._motionState.velocityAnimation ? self._motionState.velocityAnimationVelocity : 0;
        var motion = new Spring(1, 200, 20);
        motion.snap(this._variable.valueOf());
        motion.setEnd(this._variable.valueOf() + violationDelta, velocity);

        this._motionState.constraintAnimation = animation(motion,
            function() {
                self._motionState.constraintAnimationPosition = motion.x();
                self._motionState.constraintAnimationVelocity = motion.dx(); // unused.
                self._update();

                if (motion.done()) {
                    self._cancelAnimation('constraintAnimation');
                    self._update();
                }
            });
        return;
    }
    // No constraint violation, just a plain motion animation incorporating the velocity
    // imparted by the finger.
    var motion = this.createMotion(this._variable.valueOf(), velocity);
    this._motionState.velocityAnimation = animation(motion,
        function() {
            self._motionState.velocityAnimationPosition = motion.x();
            self._motionState.velocityAnimationVelocity = motion.dx();
            self._update();
            // If we've hit the end then cancel ourselves and update the system
            // which will end the edit.
            if (motion.done()) {
                self._cancelAnimation('velocityAnimation');
                self._update();
            }
        });
}
Manipulator.prototype.hitConstraint = function(constraint, coefficient, delta) {
    // XXX: Handle hitting multiple constraints.
    if (constraint == this._hitConstraint) return;
    this._hitConstraint = constraint;
    this._constraintCoefficient = coefficient;


    if (this._motionState.dragging) {
        this._update();
        return;
    }
    this._createAnimation();
}
Manipulator.prototype.hitConstraints = function(violations) {
    // XXX: Do something good here instead.
    //
    // Sort the violations by the largest delta and then just handle that one.
    if (violations.length == 0) {
        this._hitConstraint = null;
        this._constraintCoefficient = 1;
        return;
    }
    violations.sort(function(a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    this.hitConstraint(violations[0].motionConstraint, violations[0].coefficient, violations[0].delta);
}
