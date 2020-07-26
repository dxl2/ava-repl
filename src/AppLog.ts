let log = require('tracer').colorConsole({
    format: "{{timestamp}} <{{title}}> {{file}}:{{line}} {{message}}",
    dateformat: "HH:MM:ss.L"
})
export { log };