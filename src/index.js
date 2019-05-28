#! /usr/bin/env node
const axios = require("axios");
const chalk = require("chalk");
const inquirer = require("inquirer");
const terminalLink = require("terminal-link");

let baseRevisionNumber;
let revisions;
let revisionPromiseArray = [];
let revisionArray;

let documentArray = [];

inquirer
  .prompt([
    {
      type: "input",
      name: "baseUrl",
      message: "Please enter the URL of a Couch document"
    }
  ])
  .then(answers => {
    fetchRevisions(answers.baseUrl);
  });

async function fetchRevisions(url) {
  const response = await axios.get(`${url}?revs=true`);
  try {
    [baseRevisionNumber, baseRevisionString] = response.data._rev.split("-");
    revisions = response.data._revisions.ids;

    revisions.forEach((revision, index) => {
      const currentRevisionNumber = baseRevisionNumber - index;
      const currentRevisionFull = `${currentRevisionNumber}-${revision}`;
      revisionPromiseArray.push(axios.get(`${url}?rev=${currentRevisionFull}`));
    });

    revisionArray = await Promise.all(
      revisionPromiseArray.map(p => p.catch(e => e))
    );

    revisionArray.forEach((result, index) => {
      if (result instanceof Error) {
        //console.error(result.response);
        //if(result.response.status === 404) {
          const missingRev = result.response.request.path.split("?rev=")[1];
          console.log(
            chalk.bgBlue.white(
                `Revision ${missingRev} unavailable.`,
            )
          );
        //}
        return;
      }
      const thisRevisionNumber = result.data._rev.split("-")[0];
      if (result.data._deleted) {
        console.log(
          chalk.bgRed.black(
            terminalLink(
              `Revision ${thisRevisionNumber}`,
              `${url}?rev=${result.data._rev}`
            )
          )
        );
      } else {
        console.log(
          chalk.bgGreen.black(
            terminalLink(
              `Revision ${thisRevisionNumber}`,
              `${url}?rev=${result.data._rev}`
            )
          )
        );
      }
    });
  } catch (err) {
    console.error(err);
  }
}
