// Twitter scrolling and bunching example. A bit like Android notifications.

// Helpers to make cassowary.js a bit clearer.
var weak = c.Strength.weak;
var medium = c.Strength.medium;
var strong = c.Strength.strong;
var required = c.Strength.required;

var eq  = function(a1, a2, strength, w) {
  return new c.Equation(a1, a2, strength || weak, w||0);
};
var neq = function(a1, a2, a3) { return new c.Inequality(a1, a2, a3); };
var geq = function(a1, a2, str, w) { return new c.Inequality(a1, c.GEQ, a2, str, w); };
var leq = function(a1, a2, str, w) { return new c.Inequality(a1, c.LEQ, a2, str, w); };

var stay = function(v, strength, weight) {
  return new c.StayConstraint(v, strength||weak, weight||0);
};
var weakStay =     function(v, w) { return stay(v, weak,     w||0); };
var mediumStay =   function(v, w) { return stay(v, medium,   w||0); };
var strongStay =   function(v, w) { return stay(v, strong,   w||0); };
var requiredStay = function(v, w) { return stay(v, required, w||0); };

// Data model. Fake tweets, some with media attributes to make them sticky.
var model = [
    {
        user: 'ralph thomas',
        content: 'Check out my new article http://iamralpht.github.io/',
        type: 'url',
    },
    {
        user: 'stuart murdoch',
        content: "I likes this",
        type: 'audio',
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'Thom Yorke',
        content: "Preview of our new album",
        type: 'audio',
    },
    {
        user: 'Blender.org',
        content: "Announcing our new video",
        type: 'video'
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'xyz',
        content: 'More text content. 1 2 3.'
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'ralph thomas',
        content: 'Is there some fake tweet generator somewhere?'
    },
];

// This object manages the list of tweets that are currently opened and
// ensures that they all have good constraints.
function OpenedTweets(context) {
    this._context = context;
    this._solver = context.solver();
    this._update = context.update.bind(context);
    this._tweets = [];
    this._spacing = new c.Variable();
    this._solver.add(geq(this._spacing, 6, medium));

    context.addMotionConstraint(
        new MotionConstraint(this._spacing, '>=', 6));
    context.addMotionConstraint(
        new MotionConstraint(this._spacing, '<=', 90));

    this._dimmer = document.createElement('div');
    this._dimmer.className = 'dimmer';
    this._selectedCount = 0;
}
OpenedTweets.prototype.makeInteractive = function(index, box, button) {
    var solver = this._solver;
    var tweet = {
        index: index,
        box: box,
        button: button,
        constraints: null,
        selected: false
    };
    this._tweets.push(tweet);
    var self = this;

    // Make it manipulable too, so that it can control the expansion by being
    // dragged. We use the pointer-events style to ensure that it only does
    // this when it's in the sticky state (though it should only do it when
    // its sticky and stuck to the top).
    this._context.addManipulator(
        new Manipulator(this._spacing, this._solver, this._update, box.element(), 'y'));

    // Attempt at a button; should actually do proper gesture detection and not
    // eat events if it looks like a drag...
    addTouchOrMouseListener(button, {
        onTouchEnd: function() {
            if (tweet.selected) self._unselectTweet(tweet);
            else self._selectTweet(tweet);
        }});
}
OpenedTweets.prototype._selectTweet = function(tweet) {
    var e = tweet.box.element();
    e.style.zIndex = tweet.index + 1;
    e.classList.add('sticky');
    tweet.button.textContent = 'STOP AUDIO';
    tweet.selected = true;

    this._reconstrain();
}
OpenedTweets.prototype._unselectTweet = function(tweet) {
    var e = tweet.box.element();
    e.style.zIndex = 0;
    e.classList.remove('sticky');
    tweet.button.textContent = 'PLAY AUDIO';
    tweet.selected = false;

    this._reconstrain();
}
OpenedTweets.prototype._reconstrain = function() {
    var selected = [];

    for (var i = 0; i < this._tweets.length; i++) {
        var t = this._tweets[i];
        if (t.selected) selected.push(t);
        if (!t.constraints) continue;
        for (var k = 0; k < t.constraints.length; k++) {
            this._solver.removeConstraint(t.constraints[k]);
        }
        t.constraints = null;
    }
    selected.sort(function(a, b) { return a.index - b.index; });
    for (var i = 0; i < selected.length; i++) {
        var t = selected[i];
        t.constraints = [
            geq(t.box.y, c.times(i, this._spacing), medium),
            leq(t.box.bottom, 420 - (selected.length - i - 1) * 6, medium)
        ];
        for (var k = 0; k < t.constraints.length; k++)
            this._solver.addConstraint(t.constraints[k]);
    }
    this._selectedCount = selected.length;
    this._solver.solve();
    this._update();
}
OpenedTweets.prototype.update = function() {
    var spacing = this._spacing.valueOf();
    var showDimmer = spacing > 30 && this._selectedCount > 1;

    if (showDimmer == this._lastShowDimmer) return;
    this._lastShowDimmer = showDimmer;
    if (showDimmer) this._dimmer.classList.add('show');
    else this._dimmer.classList.remove('show');

    if (this._selectedCount <= 1) {
        // Smash the spacing back to the minimum when there's nothing selected.
        this._solver.beginEdit(this._spacing, c.Strength.strong);
        this._solver.suggestValue(this._spacing, 6);
        this._solver.endEdit(this._spacing);
    }
}
OpenedTweets.prototype.element = function() { return this._dimmer; }


// Make a tweet display nested in a box controlled by constraint layout.
function makeTweet(index, tweet, openedTweets) {
    var box = new Box();
    box.right = 320;
    box.height = 65;

    box.element().classList.add('tweet');

    // Make content.
    var photo = document.createElement('div');
    photo.className = 'photo';
    box.element().appendChild(photo);

    var text = document.createElement('div');
    text.className = 'text';
    var user = document.createElement('div');
    user.className = 'username';
    user.textContent = tweet.user;
    text.appendChild(user);
    var tweetText = document.createElement('span');
    tweetText.textContent = tweet.content;
    text.appendChild(tweetText);
    box.element().appendChild(text);

    if (tweet.type == 'audio') {
        box.element().classList.add('audio-tweet');
        
        var progress = document.createElement('div');
        progress.className = 'progress';
        box.element().appendChild(progress);

        var audioControls = document.createElement('div');
        audioControls.className = 'button';
        audioControls.textContent = 'PLAY AUDIO';
        box.element().appendChild(audioControls);

        openedTweets.makeInteractive(index, box, audioControls);
    }

    return box;
}

function makeTwitterExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();
    var tweets = [];
    var motionConstraints = [];
    var openedTweets = new OpenedTweets(context, motionConstraints);

    parentElement.appendChild(openedTweets.element());

    var scrollPosition = new c.Variable();

    for (var i = 0; i < model.length * 4; i++) {
        var tweetModel = model[i % model.length];

        var tweet = makeTweet(i, tweetModel, openedTweets);
        parentElement.appendChild(tweet.element());

        tweet.y = new c.Variable();
        tweet.bottom = new c.Variable();

        // Add some constraints so that this tweet appears under the
        // previous tweet and attached to the scroll position.
        if (i > 0) {
            solver.add(eq(tweet.y, c.plus(scrollPosition, i * 90), weak));
        } else {
            solver.add(eq(tweet.y, scrollPosition, weak));
        }
        // Make the tweet 65 tall. This is clumsily represented; messes with box sizing currently.
        solver.add(eq(tweet.bottom, c.plus(tweet.y, 90), medium));

        tweets.push(tweet);
        context.addBox(tweet);
    }

    // Don't scroll over the ends.
    context.addMotionConstraint(
        new MotionConstraint(tweets[0].y, '<=', 0));
    context.addMotionConstraint(
        new MotionConstraint(tweets[tweets.length - 1].bottom, '>=', 420));

    // Let openedTweets get an update message when the solver runs so that it
    // can show/hide its dimming layer. Super need more state control from
    // state controlling active constraints to constraints driving state (not
    // sure how to avoid cycles though).
    tweets.push(openedTweets);
    context.addBox(openedTweets);

    context.addManipulator(new Manipulator(scrollPosition, solver, context.update.bind(context), parentElement, 'y'));
}

makeTwitterExample(document.getElementById('timeline'));
