var keystone = require('keystone'),
    restUtils = require('./restUtils'),
    express = require('express'),
    router = express.Router();

var Campus = keystone.list("Campus");
var model = Campus.model;

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

router.route('/:id/ministries')
    .get(function (req, res) {
        keystone.list('Ministry').model.find({ campus: req.params.id }).exec(function (err, ministries) {
            if (err) return res.status(401).send(err);
            return res.json(ministries);
        });
    });

module.exports = router;
