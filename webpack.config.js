const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const config = {
    ...defaultConfig,
    module: {
        ...defaultConfig.module,
        rules: [ ...defaultConfig.module.rules ],
    },
};

// Remove the `CopyWebpackPlugin` to avoid copying php files to the build folder.
config.plugins = config.plugins.filter( ( plugin ) => {
    return plugin.constructor.name !== 'CopyPlugin';
} );

module.exports = { ...config };
