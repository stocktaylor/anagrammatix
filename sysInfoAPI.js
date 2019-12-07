// Import the OS module
const os = require(`os`);

exports.getFullSysInfoJSON = () => {
    return ret = {
        hostname: os.hostname(),
        nodeVersion: process.version,
        osType: os.type(),
        cpus: os.cpus()
    }
}