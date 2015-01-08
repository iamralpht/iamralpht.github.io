'use strict';
// This object updates all of the boxes from the constraint solver. It also tests
// all of the motion constraints and identifies which manipulator caused a motion
// constraint to be violated.
function MotionContext() {
    this._solver = new MultiEditSolver(new c.SimplexSolver());
    this._boxes = [];
    this._motionConstraints = [];
    this._manipulators = [];
    this._updating = false;
}
MotionContext.prototype.solver = function() { return this._solver; }
MotionContext.prototype.addBox = function(box) {
    this._boxes.push(box);
}
MotionContext.prototype.boxes = function() { return this._boxes; }
MotionContext.prototype.addMotionConstraint = function(motionConstraint) {
    this._motionConstraints.push(motionConstraint);
    return motionConstraint;
}
MotionContext.prototype.addManipulator = function(manipulator) {
    this._manipulators.push(manipulator);
    manipulator._setMotionContext(this);
    this.update(); // XXX: Remove -- constructing a Manipulator used to do this, moved it here but it should go.
    return manipulator;
}
MotionContext.prototype.update = function() {
    // Prevent re-entrancy which can happen when a motion constraint violation
    // causes an animation to be created which propagates another update.
    if (this._updating) return;
    this._updating = true;
    this._resolveMotionConstraints();
    for (var i = 0; i < this._boxes.length; i++) {
        this._boxes[i].update();
    }
    this._updating = false;
}
// Find out how a manipulator is related to a variable.
MotionContext.prototype._coefficient = function(manipulator, variable) {
    var solver = this._solver.solver();
    var v = manipulator.variable();
    // Iterate the edit variables in the solver. XXX: these are private and we need a real interface soon.
    var editVarInfo = solver._editVarMap.get(v);
    // No edit variable? No contribution to the current violation.
    if (!editVarInfo) return 0;
    // Now we can ask the coefficient of the edit's minus variable to the manipulator's variable. This
    // is what the solver does in suggestValue.
    var editMinus = editVarInfo.editMinus;
    // Get the expression that corresponds to the motion constraint's violated variable.
    // This is probably an "external variable" in cassowary.
    var expr = solver.rows.get(variable);
    if (!expr) return 0;
    // Finally we can compute the value.
    return expr.coefficientFor(editMinus);
}
MotionContext.prototype._resolveMotionConstraints = function() {
    var allViolations = {};

    // We want to call all manipulators so that those that previously were violating but now
    // are not get those violations removed.
    for (var i = 0; i < this._manipulators.length; i++) {
        var manipulator = this._manipulators[i];
        allViolations[manipulator.name()] = { manipulator: manipulator, violations: [] };
    }

    function addViolation(manipulator, motionConstraint, coefficient, delta) {
        var record = { motionConstraint: motionConstraint, coefficient: coefficient, delta: delta };
        var name = manipulator.name();
        if (!allViolations.hasOwnProperty(name)) {
            allViolations[name] = { manipulator: manipulator, violations: [record] };
        } else {
            allViolations[name].violations.push(record);
        }
    }
    function dispatchViolations() {
        for (var k in allViolations) {
            var info = allViolations[k];
            info.manipulator.hitConstraints(info.violations);
        }
    }

    for (var i = 0; i < this._motionConstraints.length; i++) {
        var pc = this._motionConstraints[i];
        var delta = pc.delta();
        if (delta == 0)
            continue;

        // Notify the manipulators that contributed to this violation.
        for (var j = 0; j < this._manipulators.length; j++) {
            var manipulator = this._manipulators[j];
            
            // If there's no delta and the manipulator isn't animating then it isn't a violation we want to deal
            // with now.
            if (delta == 0) continue;

            var c = this._coefficient(manipulator, pc.variable);

            // Do nothing if they're unrelated (i.e.: the coefficient is zero; this manipulator doesn't contribute).
            if (c == 0) continue;

            // We found a violation and the manipulator that contributed. Remember it and we'll
            // tell the manipulator about all the violations it contributed to at once afterwards
            // and it can decide what it's going to do about it...
            addViolation(manipulator, pc, c, delta);
        }
        // XXX: We should find ONE manipulator, or figure out which manipulator to target in the
        //      case of multiple. If we have one doing an animation, and one doing a touch drag
        //      then maybe we want to constrain the animating manipulator and let the touch one
        //      ride?
    }
    // Tell all the manipulators that we're done constraining.
    dispatchViolations();
}
MotionContext.prototype.stopOthers = function(variable) {
    // Kill all the manipulators that are animating this variable. There's a new touch point
    // that's now dominant.
    for (var i = 0; i < this._manipulators.length; i++) {
        var manipulator = this._manipulators[i];
        if (this._coefficient(manipulator, variable) != 0) manipulator.cancelAnimations();
    }
}
