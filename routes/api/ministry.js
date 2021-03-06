var keystone = require('keystone'),
    restUtils = require('./restUtils'),
    express = require('express'),
    router = express.Router();

var Ministry = keystone.list("Ministry");
var CommunityGroup = keystone.list("CommunityGroup").model;
var MinistryQuestionAnswer = keystone.list("MinistryQuestionAnswer").model;
var model = Ministry.model;

router.route('/:id/questions')
    .get(function (req, res) {
        keystone.list('MinistryQuestion').model.find({ ministry: req.params.id }).populate("selectOptions").exec(function (err, questions) {
            if (err) return res.send(err);
            return res.json(questions);
        });
    });

router.route('/')
    .get(function (req, res) {
        restUtils.list(model, req, res);
    })
    .post(function (req, res) {
        restUtils.create(model, req, res);
    });

router.route('/:id')
    .get(function (req, res) {
        restUtils.get(model, req, res);
    })
    .patch(function (req, res) {
        restUtils.update(model, req, res);
    });

router.route('/search')
    .post(function (req, res) {
        restUtils.search(model, req, res);
    });

router.route('/enumValues/:key')
    .get(function (req, res) {
        restUtils.enumValues(model, req, res);
    });

router.route('/find')
    .post(function (req, res) {
        restUtils.find(model, req, res);
    });

router.route('/:id/teams')
    .get(function (req, res) {
        model.find({ _id: req.params.id }).populate('teams').exec(function (err, ministry) {
            if (err) return res.status(400).send(err);
            return res.json(ministry.teams);
        });
    });

router.route('/:id/campus')
    .get(function (req, res) {
        model.find({ _id: req.params.id }).populate('campus').exec(function (err, ministry) {
            if (err) return res.status(400).send(err);
            return res.json(ministry.campus);
        });
    });

// Filters out valid groups based on MinistryQuestionAnswers
function getValidGroups(groups, answers) {
    var valid_groups = [];
    groups.forEach(function (group) {
        if (group.answers) {
            var valid = true;
            // The dictionary of answers-value pairs got converted into two lists of answers and values for some reason,
            // so there should only be 1 entry, which contains two lists.
            answers[0].value.forEach(function (v, i) {
                var questionId = answers[0].question[i];

                if (valid && group.answers[questionId] != v) {
                    valid = false;
                }
            });
            if (valid)
                valid_groups.push(group);
        }
    });
    return valid_groups;
}

// Returns community groups for a ministry based on answers to questions
router.route('/:id/communitygroups')
    .post(function (req, res) {
        CommunityGroup.find({ ministry: req.params.id }).populate('leaders').exec(function (err, groups) {
            if (err) return res.send(err);

            var valid_groups = [];
            var count = 0; // Used to enforce synchronicity when complete

            // Finds the answers that each community group provided
            groups.forEach(function (group) {
                MinistryQuestionAnswer.find({ communityGroup: group._id }).populate('question').exec(function (err, answers) {
                    if (err) return res.send(err);

                    // Filters out non-required answers
                    answers = answers.filter(function (answer) {
                        return answer.question.required;
                    });

                    // As long as there is an answer, proceed
                    if (answers.length > 0) {
                        var index = -1;
                        // Gets the index of the community group that we searched for earlier
                        // Since mongoose find queries are asynchronous, we can't guarantee the value of i
                        // thus forcing us to get the index again
                        groups.some(function (group, idx) {
                            answers[0].communityGroup.forEach(function (gr) {
                                if (group._id + '' == gr + '') {
                                    index = idx;
                                    return true;
                                }
                            });
                        });
                        // Converts the mongoose doc into a regular object so that we can modify the fields
                        groups[index] = groups[index].toObject();

                        // Adds the answers to the group objects for ease of use later
                        groups[index].answers = {};
                        answers.forEach(function (answer) {
                            groups[index].answers[answer.question._id] = answer.answer;
                        });
                    }

                    // Checks to see if all groups have been iterated through
                    if (++count == groups.length) {
                        valid_groups = getValidGroups(groups, req.body.answers);
                        console.log(valid_groups);
                        return res.json(valid_groups);
                    }
                });
            });
        });
    });

module.exports = router;
