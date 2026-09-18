import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const laneDefinitions = {
  deterministic: {
    scoreName: "Deterministic Compatibility Score",
    statuses: ["complete", "unreliable", "unavailable"],
  },
  startup: {
    scoreName: "Startup Compatibility Score",
    statuses: ["complete", "unavailable"],
  },
  validation: {
    scoreName: "Validation Loop Score",
    statuses: ["complete", "unavailable"],
  },
  docs: {
    scoreName: "Docs Reliability Score",
    statuses: ["complete", "unavailable"],
  },
};

const laneNames = Object.keys(laneDefinitions);
const workflowLaneNames = ["startup", "validation", "docs"];
const statefulLaneNames = ["startup", "validation"];
const commandOutcomes = ["passed", "failed", "blocked"];

export class ResultsValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResultsValidationError";
  }
}

function failValidation(message) {
  throw new ResultsValidationError(message);
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    failValidation(`${field} must be a non-empty string.`);
  }
  return value;
}

function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function validateStringEvidence(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    failValidation(`${field} must be a non-empty array of strings.`);
  }

  return value.map((item, index) =>
    validateNonEmptyString(item, `${field}[${index}]`),
  );
}

function validateProblems(value, laneName) {
  if (!Array.isArray(value)) {
    failValidation(`${laneName}.problems must be an array.`);
  }

  return value.map((problem, index) => {
    const field = `${laneName}.problems[${index}]`;
    if (!isRecord(problem)) {
      failValidation(`${field} must be an object.`);
    }
    if (!Array.isArray(problem.evidence)) {
      failValidation(`${field}.evidence must be an array.`);
    }

    return {
      ...problem,
      title: validateNonEmptyString(problem.title, `${field}.title`),
      evidence: problem.evidence.map((item, evidenceIndex) =>
        validateNonEmptyString(item, `${field}.evidence[${evidenceIndex}]`),
      ),
      remediation: validateNonEmptyString(
        problem.remediation,
        `${field}.remediation`,
      ),
    };
  });
}

function validateCommands(value, laneName) {
  if (!Array.isArray(value)) {
    failValidation(`${laneName}.commands must be an array.`);
  }

  return value.map((command, index) => {
    const field = `${laneName}.commands[${index}]`;
    if (!isRecord(command)) {
      failValidation(`${field} must be an object.`);
    }
    if (!commandOutcomes.includes(command.outcome)) {
      failValidation(
        `${field}.outcome must be one of: ${commandOutcomes.join(", ")}.`,
      );
    }

    return {
      ...command,
      command: validateNonEmptyString(command.command, `${field}.command`),
    };
  });
}

function validateLane(laneName, lane) {
  const definition = laneDefinitions[laneName];

  if (!isRecord(lane)) {
    failValidation(`${laneName} must be an object.`);
  }

  if (lane.scoreName !== definition.scoreName) {
    failValidation(`${laneName}.scoreName must be "${definition.scoreName}".`);
  }

  if (!definition.statuses.includes(lane.status)) {
    failValidation(
      `${laneName}.status must be one of: ${definition.statuses.join(", ")}.`,
    );
  }

  if (lane.status === "unavailable") {
    if (lane.score !== null) {
      failValidation(
        `${laneName}.score must be null when status is unavailable.`,
      );
    }
  } else if (
    typeof lane.score !== "number" ||
    !Number.isFinite(lane.score) ||
    lane.score < 0 ||
    lane.score > 100
  ) {
    failValidation(
      `${laneName}.score must be a finite number from 0 through 100.`,
    );
  }

  if (laneName === "deterministic") {
    if (typeof lane.classificationReliable !== "boolean") {
      failValidation("deterministic.classificationReliable must be a boolean.");
    }

    const expectedReliability = lane.status === "complete";
    if (lane.classificationReliable !== expectedReliability) {
      failValidation(
        "deterministic.classificationReliable must be " +
          `${expectedReliability} when status is ${lane.status}.`,
      );
    }
  }

  const reportedTargetRoot = validateNonEmptyString(
    lane.targetRoot,
    `${laneName}.targetRoot`,
  );
  if (!isAbsolute(reportedTargetRoot)) {
    failValidation(`${laneName}.targetRoot must be an absolute path.`);
  }
  const targetRoot = canonicalPath(reportedTargetRoot);

  const normalized = {
    ...lane,
    targetRoot,
    summary: validateNonEmptyString(lane.summary, `${laneName}.summary`),
    evidence: validateStringEvidence(lane.evidence, `${laneName}.evidence`),
    problems: validateProblems(lane.problems, laneName),
    commands: validateCommands(lane.commands, laneName),
  };

  if (statefulLaneNames.includes(laneName)) {
    const executionRoot = lane.executionRoot;
    const hasExecutionRoot =
      typeof executionRoot === "string" && executionRoot.trim() !== "";

    if (lane.status !== "unavailable") {
      if (!hasExecutionRoot || !isAbsolute(executionRoot)) {
        failValidation(`${laneName}.executionRoot must be an absolute path.`);
      }
      const canonicalExecutionRoot = canonicalPath(executionRoot);
      if (canonicalExecutionRoot === targetRoot) {
        failValidation(
          `${laneName}.executionRoot must differ from targetRoot.`,
        );
      }
      if (lane.isolation !== "isolated-copy") {
        failValidation(`${laneName}.isolation must be "isolated-copy".`);
      }
      normalized.executionRoot = canonicalExecutionRoot;
    } else {
      if (hasExecutionRoot && !isAbsolute(executionRoot)) {
        failValidation(
          `${laneName}.executionRoot must be null or an absolute path.`,
        );
      }
      if (!hasExecutionRoot && executionRoot !== null) {
        failValidation(
          `${laneName}.executionRoot must be null or an absolute path.`,
        );
      }
      if (!["isolated-copy", "unavailable"].includes(lane.isolation)) {
        failValidation(
          `${laneName}.isolation must be "isolated-copy" or "unavailable".`,
        );
      }
      normalized.executionRoot = hasExecutionRoot
        ? canonicalPath(executionRoot)
        : null;
    }
  }

  return normalized;
}

export function validateResults(input) {
  if (!isRecord(input)) {
    failValidation("Input must be an object containing the four result lanes.");
  }

  for (const laneName of laneNames) {
    if (!Object.hasOwn(input, laneName)) {
      failValidation(`missing lane "${laneName}".`);
    }
  }

  for (const laneName of Object.keys(input)) {
    if (!Object.hasOwn(laneDefinitions, laneName)) {
      failValidation(`unexpected lane "${laneName}".`);
    }
  }

  const lanes = Object.fromEntries(
    laneNames.map((laneName) => [
      laneName,
      validateLane(laneName, input[laneName]),
    ]),
  );
  const targetRoot = lanes.deterministic.targetRoot;
  for (const laneName of workflowLaneNames) {
    if (lanes[laneName].targetRoot !== targetRoot) {
      failValidation("all lanes must use the same targetRoot.");
    }
  }
  if (
    lanes.startup.executionRoot !== null &&
    lanes.startup.executionRoot === lanes.validation.executionRoot
  ) {
    failValidation("startup and validation must use a separate executionRoot.");
  }

  return lanes;
}

function baseSynthesis(components) {
  return {
    schemaVersion: 1,
    status: null,
    agentCompatibilityScore: null,
    workflowCompatibilityScore: null,
    components,
    unavailableWorkflowLanes: [],
    reason: null,
  };
}

export function synthesizeResults(input) {
  const components = validateResults(input);
  const synthesis = baseSynthesis(components);
  const unavailableWorkflowLanes = workflowLaneNames.filter(
    (laneName) => components[laneName].status === "unavailable",
  );

  if (unavailableWorkflowLanes.length > 0) {
    return {
      ...synthesis,
      status: "unavailable",
      unavailableWorkflowLanes,
      reason: {
        code: "WORKFLOW_LANES_UNAVAILABLE",
        message:
          "No aggregate was computed because workflow lanes are unavailable: " +
          `${unavailableWorkflowLanes.join(", ")}.`,
      },
    };
  }

  const workflowCompatibilityScore = Math.round(
    workflowLaneNames.reduce(
      (total, laneName) => total + components[laneName].score,
      0,
    ) / workflowLaneNames.length,
  );

  if (components.deterministic.status === "unreliable") {
    return {
      ...synthesis,
      status: "degraded",
      workflowCompatibilityScore,
      reason: {
        code: "DETERMINISTIC_UNRELIABLE",
        message:
          "The deterministic classification is unreliable; only workflow evidence was aggregated.",
      },
    };
  }

  if (components.deterministic.status === "unavailable") {
    return {
      ...synthesis,
      status: "degraded",
      workflowCompatibilityScore,
      reason: {
        code: "DETERMINISTIC_UNAVAILABLE",
        message:
          "The deterministic scan is unavailable; only workflow evidence was aggregated.",
      },
    };
  }

  return {
    ...synthesis,
    status: "complete",
    agentCompatibilityScore: Math.round(
      components.deterministic.score * 0.7 + workflowCompatibilityScore * 0.3,
    ),
    workflowCompatibilityScore,
  };
}

class CliInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CliInputError";
    this.code = code;
  }
}

async function readStdin() {
  let input = "";
  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input;
}

async function readCliInput(arguments_) {
  if (arguments_.length > 1) {
    throw new CliInputError(
      "INVALID_USAGE",
      "Pass one JSON file path, '-' for stdin, or pipe JSON with no argument.",
    );
  }

  const inputPath = arguments_[0];
  if (inputPath === undefined || inputPath === "-") {
    if (inputPath === undefined && process.stdin.isTTY) {
      throw new CliInputError(
        "INVALID_USAGE",
        "Pass one JSON file path, '-' for stdin, or pipe JSON with no argument.",
      );
    }

    return readStdin();
  }

  try {
    return await readFile(inputPath, "utf8");
  } catch {
    throw new CliInputError(
      "INPUT_READ_ERROR",
      `Unable to read input file: ${inputPath}`,
    );
  }
}

function parseJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    throw new CliInputError("INVALID_JSON", "Input is not valid JSON.");
  }
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runCli() {
  try {
    const input = await readCliInput(process.argv.slice(2));
    writeJson(process.stdout, synthesizeResults(parseJson(input)));
  } catch (error) {
    const cliError =
      error instanceof ResultsValidationError
        ? new CliInputError("INVALID_RESULTS", error.message)
        : error;

    const code =
      cliError instanceof CliInputError ? cliError.code : "INTERNAL_ERROR";
    const message =
      cliError instanceof CliInputError
        ? cliError.message
        : "Result synthesis failed unexpectedly.";

    writeJson(process.stderr, {
      status: "invalid",
      error: { code, message },
    });
    process.exitCode = 1;
  }
}

function isMainModule() {
  if (process.argv[1] === undefined) {
    return false;
  }

  try {
    return (
      realpathSync(resolve(process.argv[1])) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isMainModule()) {
  await runCli();
}
