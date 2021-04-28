const core = require('@actions/core');
const github = require('@actions/github');
const AWS = require('aws-sdk')
const fs = require('fs')

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const {execSync} = require("child_process");

const git_latest_tag_command = 'git describe --tags --abbrev=0'

try {
    const stack = core.getInput('stack');
    const reportId = core.getInput('report-id');

    let versionDetails = processVersions(reportId, stack)

    core.setOutput("versionDetails", versionDetails);
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}

function processVersions(reportId, stack) {
    let version = getVersion()
    let rushFile = fs.readFileSync(`rush.json`)
    let rush = JSON.parse(rushFile)
    let repositoryName = rush["repository"]["url"].split('/').pop()
    let projectLocations = rush["projects"]
    let projects = getProjectVersions(projectLocations)

    let versionDetails = {
        'version': version,
        'date': new Date().toISOString(),
        'projects': projects,
        'stack': stack,
        'repository': repositoryName
    }

    let dynamodbItem = {...versionDetails};
    dynamodbItem['PK'] = `REPOSITORY#${repositoryName}`
    dynamodbItem['SK'] = `STACK#${stack}`
    let params = {
        TableName: `rush-version-report-${reportId}`,
        Item: dynamodbItem
    };

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