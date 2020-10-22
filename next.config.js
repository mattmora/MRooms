const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {

    if (phase === PHASE_DEVELOPMENT_SERVER) {
        return {
            reactStrictMode: true,
        }
    }

    return {
        reactStrictMode: true,
    }
}

    // "dev": "node server.js",
    // "build": "next dev",
    // "start": "next start -p $PORT"