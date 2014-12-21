"use strict";

// Wrap the cassowary solver so that multiple clients can begin and end edits without conflicting.
// We do this by ending an edit session whenever we need to add or remove a variable from the current
// edit and then starting a new one and pushing all of the same suggestions back in.
function MultiEditSolver(solver) {
    this._solver = solver;
    this._editing = false;
    this._editVars = [];

    // Hacky; figure out what the real API here is.
    this.add = this._solver.add.bind(this._solver);
    this.solve = this._solver.solve.bind(this._solver);
    this.resolve = this._solver.resolve.bind(this._solver);
    this.addConstraint = this._solver.addConstraint.bind(this._solver);
    this.removeConstraint = this._solver.removeConstraint.bind(this._solver);
}
MultiEditSolver.prototype.solver = function() { return this._solver; }
MultiEditSolver.prototype.beginEdit = function(variable, strength) {
    if (this._editVars.indexOf(variable) != -1) return;

    this._editVars.push({ edit: variable, strength: strength, suggest: null });
    this._reedit();
}
MultiEditSolver.prototype._find = function(variable) {
    for (var i = 0; i < this._editVars.length; i++) {
        if (this._editVars[i].edit === variable) {
            return i;
        }
    }
    return -1;
}
MultiEditSolver.prototype.endEdit = function(variable) {
    var idx = this._find(variable);
    if (idx == -1) {
        console.warn('cannot end edit on variable that is not being edited');
        return;
    }
    this._editVars.splice(idx, 1);
    this._reedit();
}
MultiEditSolver.prototype.suggestValue = function(variable, value) {
    if (!this._editing) {
        console.warn('cannot suggest value when not editing');
        return;
    }
    var idx = this._find(variable);
    if (idx == -1) {
        console.warn('cannot suggest value for variable that we are not editing');
        return;
    }
    this._editVars[idx].suggest = value;
    this._solver.suggestValue(variable, value).resolve();
}
MultiEditSolver.prototype._reedit = function() {
    if (this._editing) this._solver.endEdit();
    this._editing = false;

    if (this._editVars.length == 0) return;
    
    for (var i = 0; i < this._editVars.length; i++) {
        var v = this._editVars[i];

        this._solver.addEditVar(v.edit, v.strength);
    }

    this._solver.beginEdit();

    // Now suggest all of the previous values again. Not sure if doing them
    // in a different order will cause a different outcome...
    for (var i = 0; i < this._editVars.length; i++) {
        var v = this._editVars[i];

        if (!v.suggest) continue;

        this._solver.suggestValue(v.edit, v.suggest);
    }

    // Finally resolve.
    this._solver.resolve();
    this._editing = true;
}
