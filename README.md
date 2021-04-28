# mosaic-rush-version-report-action
Github action for version report for repositories and Rush based applications.

## Inputs

### `report-id`

**Required** Name of the report. Needs to consist of `digits (0-9)`, `letters(A-Z, a-z)`, separated by `-`.

### `stack`

**Required** Name of the stack, like dev or prod. Default `dev`.

## Outputs

### `versionDetails`

Project versions.

## Prerequisites
- Repository needs to have a `rush.json` file
- Repository needs to be tagged in git
- Dynamodb table needs to exist (sample template included in the files), follow a convention of `rush-version-report-{report-id}`
- Action needs to have basic write permissions on the table

## Example usage

```
uses: actions/mosaic-rush-version-report-action@v1.0
with:
    report-id: 'sample'
    stack: 'dev'
```
