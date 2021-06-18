/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 450:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 177:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 661:
/***/ ((module) => {

module.exports = eval("require")("aws-sdk");


/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(450);
const github = __nccwpck_require__(177);
const AWS = __nccwpck_require__(661)
const fs = __nccwpck_require__(747)

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const {execSync} = __nccwpck_require__(129);

const gitLatestTagCommand = 'git tag --list --sort=-version:refname "v*" --merged | head -n 1';

(async () => {
    try {
        const stack = core.getInput('stack');
        const reportId = core.getInput('report-id');
        const tableName = core.getInput('table-name');

        let versionDetails = await processVersions(tableName, reportId, stack)

        core.setOutput("version-details", versionDetails);
        const payload = JSON.stringify(github.context.payload, undefined, 2)
    } catch (error) {
        core.setFailed(error.message);
    }
})()


async function processVersions(tableName, reportId, stack) {
    let version = getVersion()
    let rushFile = fs.readFileSync(`rush.json`)
    let rush = JSON.parse(rushFile)
    let repositoryName = rush["repository"]["url"].split('/').pop()
    let projectLocations = rush["projects"]
    let projects = getProjectVersions(projectLocations)

    const date = new Date().toISOString()

    const latestVersionResponse = await getLatestVersionFromEnvironment(tableName, reportId, repositoryName, stack)
    const latestVersionItem = latestVersionResponse['Item']

    if (latestVersionItem) {
        let latestVersion= latestVersionItem['version']

        if (latestVersion === version) {

            let [baseVersion, hotfix] = version.split('-')
            
            if (hotfix) {
                let hotfixNumber = parseInt(hotfix.split('.')[1])
                hotfixNumber += 1
                hotfix = `hotfix.${hotfixNumber}`
    
            } else {
                hotfix = `hotfix.1`
            }
            version = `${baseVersion}-${hotfix}`
            saveVersion(version)
        }
    }

    console.info(`Repository version: ${version}`)

    let versionDetails = {
        'version': version,
        'date': date,
        'projects': projects,
        'stack': stack,
        'repository': repositoryName
    }

    let dynamodbItem = {...versionDetails};
    dynamodbItem['PK'] = reportId
    dynamodbItem['SK'] = `${repositoryName}#${stack}#${date}`
    let params = {
        TableName: tableName,
        Item: dynamodbItem
    };

    dynamodb.put(params, function (err) {
        if (err) {
            throw err
        } else {
            console.log("Successfully added version");
        }
    });

    dynamodbItem['SK'] = `LATEST#${repositoryName}#${stack}`
    dynamodb.put(params, function (err) {
        if (err) {
            throw err
        } else {
            console.log("Successfully added latest version");
        }
    });

    return versionDetails
}

async function getLatestVersionFromEnvironment(tableName, reportId, repositoryName, stack){
    var params = {
        TableName: tableName,
        Key: {
            "PK": reportId,
            "SK": `LATEST#${repositoryName}#${stack}`
        }
    };
    
    return await dynamodb.get(params).promise()
  }

function getVersion() {
    try {
        return execSync(gitLatestTagCommand).toString().trim()
    } catch(e) {
        console.error(e);
        return 'v0.0.0'
    }
}

function saveVersion(version) {
    execSync(`git tag -a ${version} -m "Hotfix";git push --tags`)
}

function getProjectVersions(projectLocations) {
    let projects = {}
    projectLocations.forEach(function (project) {
        let projectFolder = project['projectFolder']
        let projectFileLocation = `${projectFolder}/package.json`
        let projectFile = fs.readFileSync(projectFileLocation)
        let packageData = JSON.parse(projectFile);
        let name = packageData['name']
        let version = packageData['version']
        projects[name] = version
        console.info(`Name: ${name}, version: ${version}`)
    })
    return projects
}
})();

module.exports = __webpack_exports__;
/******/ })()
;