const { seedLocalReleaseFixture } = require("./local-release-fixture");

seedLocalReleaseFixture({ managerCanComment: process.env.MANAGER_CAN_COMMENT === "1" })
  .then((fixture) => process.stdout.write(`${JSON.stringify(fixture)}\n`))
  .catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
