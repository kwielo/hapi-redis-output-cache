'use strict';

const getProp               = require('lodash').get;
const cacheKeyGenerator = require('../src/cacheKeyGenerator');
const redis             = require('redis').createClient(1234, '127.0.0.1');

const getCacheKey = function (req) {
    const customCacheKeys = getProp(req, 'route.settings.plugins.hapi-redis-output-cache.customCacheKeys', []);
    return cacheKeyGenerator.generateCacheKey(req, { partition: 'test' }, customCacheKeys);
};

module.exports = {
    reset: seedValue => {
        redis.flushdb();

        if(seedValue) {
            redis.set(seedValue.key, JSON.stringify(seedValue.value));

            if(seedValue.ttl) {
                redis.expire(seedValue.key, seedValue.ttl);
            }
        }
    },
    ttl: (req, next) => {

        const key = getCacheKey(req);

        redis.ttl(key, (err, reply) => {
            if (err) {
                throw err;
            }

            return next(reply);
        });
    },
    get: (req, next) => {

        const key = getCacheKey(req);

        redis.get(key, (err, reply) => {
            if (err) {
                throw err;
            }

            return next(JSON.parse(reply));
        });
    }
};
