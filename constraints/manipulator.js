"use strict";

var manipulatorCount = 0;

// This is a wrapper over a cassowary variable. It will create an edit session
// for it when dragged and listen for violations of motion constraints.
function Manipulator(variable, solver, update, domObject, axis) {
    this._variable = variable;
    this._solver = solver;
    this._axis = axis;
    this._update = update;

    this._motion = null;
    this._animation = null;
    this._name = 'manipulator-' + variable.name + '-' + (++manipulatorCount);

    var self = this;

    addTouchOrMouseListener(domObject, {
        onTouchStart: function() {
            self._hitConstraint = null;
            // If there's an animation already running then kill it.
            if (self._animation) {
                self._animation.cancel();
                try {
                    solver.endEdit(variable);
                    solver.resolve();
                } catch (e) {
                    console.log('bad', e);
                }
                self._animation = null;
                self._motion = null;
            }
            // Start a new edit session.
            this._start = variable.valueOf();
            solver.beginEdit(variable, c.Strength.strong);
            update(self);
        },
        onTouchMove: function(dx, dy) {
            var delta = (axis == 'x') ? dx : dy;
            var pos = this._start + delta;
            // Update the last suggested position so that we know what
            // deltas are relative to when a motion violation is reported.
            self._lastPosition = pos;
            self._lastVelocity = 0;
            solver.suggestValue(variable, pos);
            update(self);
        },
        onTouchEnd: function(dx, dy, v) {
            var velocity = (axis == 'x') ? v.x : v.y;
            // XXX: There's a bug if we end with no velocity, so always fudge some;
            //      clean this up so we either acknoledge previously reported violations
            //      or just end the edit here.
            if (velocity == 0) velocity = 1;
            self._motion = self.createMotion(self._lastPosition, velocity);
            self._animation = animation(self._motion, self._animate.bind(self));
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
Manipulator.prototype._animate = function() {
    if (!this._motion) return; // XXX: Somewhere we're not stopping the animation properly.

    var x = this._motion.x();
    this._lastPosition = x;
    this._lastVelocity = this._motion.dx();
    this._solver.suggestValue(this._variable, x);

    if (this._motion.done()) {
        this._solver.endEdit(this._variable);
        this._solver.resolve();
        this._animation = null;
        this._motion = null;
    }
    this._update(this);
}
Manipulator.prototype.hitConstraint = function(constraint, coefficient, delta) {
    // XXX: Don't handle constraints when there's no animation.
    //      We should undertrack or do whatever behavior the caller
    //      or constraint wants when this happens.
    if (this._animation == null) return;
    // Only react to hiting a constraint once. XXX: If we hit two constraints
    // in one update then this will go wrong :(.
    if (this._hitConstraint == constraint) return;
    this._hitConstraint = constraint;

    // Treat every constraint as a springy constraint. We could instead
    // treat them as whatever the model suggests (stop, rebound). Not
    // there yet.
    this._motion = new Spring(1, 200, 20);
    this._motion.snap(this._lastPosition);
    this._motion.setEnd(this._lastPosition + delta * coefficient, this._lastVelocity);
    this._animation.cancel();
    this._animation = animation(this._motion, this._animate.bind(this));
}
Manipulator.prototype.hitConstraints = function(violations) {
    // XXX: Do something good here instead.
    //
    // Sort the violations by the largest delta and then just handle that one.
    if (violations.length == 0) return;
    violations.sort(function(a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    this.hitConstraint(violations[0].motionConstraint, violations[0].coefficient, violations[0].delta);
}
