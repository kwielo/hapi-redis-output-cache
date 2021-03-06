'use strict';

const hapi = require('hapi');
let fauxEndpoints;

module.exports = (options, next) => {
    const server = new hapi.Server();
    server.connection({ port: 3000 });

    options = options || {};
    options.redis = options.redis || {};

    server.on('log', event => {
        console.log(event);
    });

    server.route({
        method: "GET",
        path: "/cacheable-successful-request/{id}",
        config: {
            handler: (req, reply) => {
                reply({ id: req.params.id, test: true }).header('Content-Language', 'de-DE');
            },
            plugins: {
                'hapi-redis-output-cache': { isCacheable: true }
            }
        }
    });

    server.route({
        method: "POST",
        path: "/cacheable-successful-request",
        config: {
            handler: (req, reply) => {
                reply({ test: true }).header('Content-Language', 'de-DE').code(200);
            },
            plugins: {
                'hapi-redis-output-cache': { isCacheable: true }
            }
        }
    });

    server.route({
        method: "GET",
        path: "/non-cacheable-successful-request",
        config: {
            handler: (req, reply) => {
                reply({ test: true }).header('Content-Language', 'de-DE');
            }
        }
    });

    server.route({
        method: "GET",
        path: "/cacheable-failed-request",
        config: {
            handler: (req, reply) => {
                reply().code(500);
            },
            plugins: {
                'hapi-redis-output-cache': { isCacheable: true }
            }
        }
    });

    server.register(require('hapi-auth-basic'));
    const users = {
        a: {userId: 1}, b: {userId: 2}
    };
    const validate = function (req, username, password, cb) {
        const user = users[username];
        if (!user) {
            cb(null, false);
        }
        cb(null, true, user)
    };
    server.auth.strategy('simple', 'basic', { validateFunc: validate });
    server.route({
        method: "GET",
        path: "/cacheable-successful-request-with-custom-var/{id}",
        config: {
            auth: 'simple',
            handler: (req, reply) => {
                reply({
                    test: true,
                    userId: req.auth.credentials.userId
                }).header('Content-Language', 'pl-PL');
            },
            plugins: {
                'hapi-redis-output-cache': {
                    isCacheable: true,
                    customCacheKeys: ['auth.credentials.userId']
                }
            }
        }
    });

    server.register([
        {
            register: require('../index'),
            options: {
                partition: options.redis.partition || 'test',
                host: options.redis.host || '127.0.0.1',
                port: options.redis.port || 1234,
                staleIn: 30,
                expiresIn: 60,
                onCacheMiss: options.onCacheMiss || function(req, reply) { reply.request.context = { cacheMiss: true } }
            }
        }
    ],
    err => {
        if (err) {
            throw err;
        }

        fauxEndpoints = {
            request: (options, next) => {
                server.inject({
                    method: options.method || 'GET',
                    url: options.url,
                    headers: options.headers
                }, response => {
                    next(response);
                });
            }
        };

        setTimeout(() => {
            return next(fauxEndpoints);
        }, 50);
    });
};
