/**
 * This module converts Octopus process steps from JSON to HTML.
 */

/**
 * @typedef {object} ActionProperties
 * @property {string} "Octopus.Action.Script.ScriptBody" - The script body of the action.
 * @property {string} "Octopus.Action.Script.Syntax" - The script syntax of the action.
 * @property {string} "Octopus.Action.Template.Id" - The template the action is based on.
 * @property {string} "Octopus.Action.Template.Version" - The version of the template the action is based on.
 * @property {boolean} "Octopus.Action.RunOnServer" - A flag that indicates if the action runs on the Octopus server.
 * @property {string} BindingProtocol - The binding protocol for the software service.
 * @property {string} BindingPort - The port the software service binds to.
 * @property {string} BindingIpAddress - The IP address the software service binds to.
 * @property {string} IisAuthentication - The authentication mode for the IIS website.
 * @property {string} WebsiteName - The name of the IIS website.
 * @property {string} WebRoot - The root path of the IIS website.
 * @property {string} ApplicationPoolName - The name of the IIS application pool.
 */

/**
 * @typedef {object} Action
 * @property {string} Id - The unique identifier of the action.
 * @property {string} Name - The name of the action.
 * @property {string} ActionType - The type of the action.
 * @property {boolean} IsDisabled - A flag that indicates if the action will be skipped during deployment.
 * @property {ActionProperties} Properties - The properties of the action, which vary based on the action type.
 */

/**
 * @typedef {object} Step
 * @property {string} Type
 * @property {string} Condition
 * @property {string} StartTrigger
 * @property {Action[]} Actions
 */

/**
 * @typedef {object} OctopusProcess
 * @property {string} Id - The unique identifier of the process.
 * @property {string} ProjectId - The unique identifier of the project.
 * @property {Step[]} Steps - The list of steps in the process.
 */

import { argv } from "node:process";
import { open } from "node:fs/promises";
import { resolvePath } from "./file.js";

const OCTOPUS_TEMPLATE_PATH = resolvePath(import.meta.dirname, "../html/octopus.template.html");

function octopusScriptActionType(title, body, syntax) {
  return `<div class="action action-type-script">
<h2>${title}</h2>
<pre><code class="language-${syntax}">${body}</code></pre>
</div>`;
}

/**
 * Converts an Octopus process to HTML.
 * @param projectProcess {OctopusProcess} The Octopus process to convert.
 * @returns {string} The generated HTML.
 */
function octopusProcessToHtml(projectProcess) {
  const html = [];

  for (const step of projectProcess.Steps) {
    if (Array.isArray(step.Actions)) {
      for (const action of step.Actions) {
        if (action.ActionType === "Octopus.Script") {
          const title = `${action.Name} (${action.Properties["Octopus.Action.Script.Syntax"]})`;
          const body = action.Properties["Octopus.Action.Script.ScriptBody"];
          const syntax = action.Properties["Octopus.Action.Script.Syntax"]?.toLowerCase() ?? "text";
          html.push(octopusScriptActionType(title, body, syntax));
        }
      }
    }
  }
  return html.join("\n");
}

/**
 *
 * @param {string} filename The JSON file to load.
 * @returns {Promise<OctopusProcess | null>} The object representing the Octopus process.
 */
async function loadJsonFile(filename) {
  try {
    await using handle = await open(filename, "r");
    const content = await handle.readFile({ encoding: "utf-8" });
    await handle.close();

    if (typeof content === "string" && content.length > 0) {
      return JSON.parse(content);
    }
  }
  catch (error) {
    console.error(`Error reading file ${filename}:`, error);
  }
  return null;
}

async function main(args) {
  const [sourceJsonFile, targetHtmlFile] = args;
  const sourcePath = resolvePath(import.meta.dirname, sourceJsonFile);
  const process = await loadJsonFile(sourcePath);

  if (process) {
    const htmlToInsert = octopusProcessToHtml(process);
    await using inputHandle = await open(OCTOPUS_TEMPLATE_PATH, "r");
    const templateContent = await inputHandle.readFile({ encoding: "utf-8" });
    await inputHandle.close();

    const finalHtml = templateContent.replace("{{ CONTENT }}", htmlToInsert);
    const targetPath = resolvePath(import.meta.dirname, targetHtmlFile);
    await using outputHandle = await open(targetPath, "w");
    await outputHandle.writeFile(finalHtml, { encoding: "utf-8" });
    await outputHandle.close();

    console.log(`Successfully converted ${sourceJsonFile} to ${targetHtmlFile}`);
  }
}

await main(argv.slice(2));
