# mosaic-rush-version-report-action
Github action for version report for repositories and Rush based applications.

## Inputs

### `table-name`

**Required** Dynamodb table name to store version reports. Default `release-version-report`.

### `stack`

**Required** Name of the stack, like dev or prod. Default `dev`.

## Outputs

### `versionDetails`

Project versions.

## Prerequisites
- Repository needs to have a `rush.json` file
- Repository needs to be tagged in git
- Dynamodb table needs to exist (sample template included in the files)
- Action needs to have basic crud permissions on the table

## Example usage

```
uses: actions/mosaic-rush-version-report-action@v1.0
with:
    table-name: 'release-version-report'
    stack: 'dev'
```
