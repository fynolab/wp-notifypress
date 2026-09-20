const defaultConfig = require( '@wordpress/scripts/config/.eslintrc.js' );
const prettierConfig = require( './.prettierrc.js' );

module.exports = {
    ...defaultConfig,
    rules: {
        'prettier/prettier': [ 'error', prettierConfig ],
        'no-unused-expressions': [
            'error',
            {
                allowShortCircuit: true,
            },
        ],
        '@wordpress/i18n-text-domain': [
            'error',
            {
                allowedTextDomain: [ 'async-push' ],
            },
        ],
    },
    globals: {
        'async-push': true,
    },
};
