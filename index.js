const core = require('@actions/core');
const github = require('@actions/github');
const AWS = require('aws-sdk')
const fs = require('fs')

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const {execSync} = require("child_process");

const git_latest_tag_command = 'git tag --list --sort=-version:refname "v*" | head -n 1'

try {
    const stack = core.getInput('stack');
    const reportId = core.getInput('report-id');
    const tableName = core.getInput('table-name');

    let versionDetails = processVersions(tableName, reportId, stack)

    core.setOutput("version-details", versionDetails);
    const payload = JSON.stringify(github.context.payload, undefined, 2)
} catch (error) {
    core.setFailed(error.message);
}

function processVersions(tableName, reportId, stack) {
    let version = getVersion()
    let rushFile = fs.readFileSync(`rush.json`)
    let rush = JSON.parse(rushFile)
    let repositoryName = rush["repository"]["url"].split('/').pop()
    let projectLocations = rush["projects"]
    let projects = getProjectVersions(projectLocations)

    const date = new Date().toISOString()

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

    dynamodb.put(params, function (err, data) {
        if (err) {
            throw err
        } else {
            console.log("Success", data);
        }
    });

    dynamodbItem['SK'] = `LATEST#${repositoryName}#${stack}`
    dynamodb.put(params, function (err, data) {
        if (err) {
            throw err
        } else {
            console.log("Success", data);
        }
    });

    return versionDetails
}

function getVersion() {
    try {
        return execSync(git_latest_tag_command).toString().trim()
    } catch(e) {
        console.error(e);
        return 'v0.0.0'
    }
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