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
}
MotionContext.prototype.addManipulator = function(manipulator) {
    this._manipulators.push(manipulator);
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
MotionContext.prototype._resolveMotionConstraints = function() {
    var solver = this._solver.solver();
    function coefficient(manipulator, variable) {
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
    for (var i = 0; i < this._motionConstraints.length; i++) {
        var pc = this._motionConstraints[i];
        var delta = pc.op(pc.variable.valueOf(), pc.value);
        if (delta == 0)
            continue;

        // Notify the manipulators that contributed to this violation.
        for (var j = 0; j < this._manipulators.length; j++) {
            var manipulator = this._manipulators[j];
            var c = coefficient(manipulator, pc.variable);

            // Do nothing if they're unrelated (i.e.: the coefficient is zero; this manipulator doesn't contribute).
            if (c == 0) continue;

            // We found a manipulator!
            manipulator.hitConstraint(pc, c);
        }
    }
}
