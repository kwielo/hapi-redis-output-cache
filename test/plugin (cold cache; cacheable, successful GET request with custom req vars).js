'use strict';

const expect      = require('expect.js');
const redisHelper = require('./redisHelper');
const fauxServer  = require('./fauxServer');

describe('plugin (cold cache; cacheable, successful GET request with custom req vars)', () => {
    let responseOne, responseTwo;

    before(next => {
        redisHelper.reset();

        fauxServer(null, server => {
            server.request({
                url: '/cacheable-successful-request-with-custom-var/1',
                headers: {
                    'Accept-Language': "pl-PL, pl, en",
                    'Authorization': "Basic YTph" // User 'a'
                }
            }, r => {
                responseOne = r;
            });
            server.request({
                url: '/cacheable-successful-request-with-custom-var/1',
                headers: {
                    'Accept-Language': "pl-PL, pl, en",
                    'Authorization': "Basic Yjpi" // User 'b'
                }
            }, r => {
                responseTwo = r;
                next();
            });
        });

    });

    it('both should return status 200', () => {
        expect(responseOne.statusCode).to.be(200);
        expect(responseTwo.statusCode).to.be(200);
    });

    it('should return different userId for each request', () => {
        expect(JSON.parse(responseOne.payload).userId).to.be(1);
        expect(JSON.parse(responseTwo.payload).userId).to.be(2);
    });

    it('should cache different userId for each request', next => {
        redisHelper.get(responseOne.request, reply => {
            expect(reply.payload).to.eql({test: true, userId: 1})
        });
        redisHelper.get(responseTwo.request, reply => {
            expect(reply.payload).to.eql({test: true, userId: 2})
            next();
        });
    })

});
