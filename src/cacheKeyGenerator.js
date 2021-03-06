'use strict';

const _ = require('lodash');

const lowerCase = array => {
    const result = [];

    for(let i = 0; i < array.length; i++) {
        result.push(array[i].toLowerCase());
    }

    return result;
};

const normaliseUrl = url => {
    const pathname = url.pathname.toLowerCase();
    const sortedQueryKeys = _.keys(url.query).sort();

    let normalisedQuery = '';
    sortedQueryKeys.forEach(key => {
        normalisedQuery += `${key}=${url.query[key]}&`
    });

    if(normalisedQuery.length > 0) {
        normalisedQuery = `?${normalisedQuery}`
    }

    return `${pathname}${normalisedQuery}`;
};

const normaliseHeaders = (rawRequestHeaders, varyByHeaders) => {
    if(!varyByHeaders) {
        return null;
    }

    const requestHeaders = _.map(_.keys(rawRequestHeaders), requestHeaderKey => {
        return {
            key: requestHeaderKey.toLowerCase(),
            value: rawRequestHeaders[requestHeaderKey]
        }
    });

    const varyByHeaderKeys = _.sortBy(lowerCase(varyByHeaders));

    const filteredHeaders = _.compact(_.map(varyByHeaderKeys, varyByHeaderKey => {
        const requestHeader = _.find(requestHeaders, requestHeader => { return requestHeader.key === varyByHeaderKey; });
        return requestHeader ? `${requestHeader.key}=${requestHeader.value.replace(/(\s+)/gi, '')}` : null;
    }));

    return filteredHeaders.join('|');
};

const normaliseCustomCacheKeys = (request, customCacheKeys) => {
    if (!customCacheKeys) {
        return null;
    }

    return _
        .chain(customCacheKeys)
        .map(customCacheKey => ({
          key: customCacheKey,
          value: _.get(request, customCacheKey, null)
        }))
        .reject(variable => variable.value === null)
        .filter(variable => (_.isString(variable.value) || _.isNumber(variable.value)))
        .map(customVariable => (`${customVariable.key}=${_.toLower(customVariable.value)}`))
        .join('|')
        .value();
};

module.exports = {
    generateCacheKey: (req, options, customCacheKeys) => {
        const partition = options.partition || 'default';
        const method    = req.route.method.toLowerCase();
        const path      = normaliseUrl(req.url);
        const headers   = normaliseHeaders(req.headers, options.varyByHeaders);
        const custom    = normaliseCustomCacheKeys(req, customCacheKeys);

        return _.compact([partition, method, path, headers, custom]).join('|');
    }
};
