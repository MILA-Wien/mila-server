import pkg from "../../package.json";
import survey_01 from "../schemas/survey_01";

// Register extension on startup
export default defineNitroPlugin(() => {
  registerExtension({
    name: "mila",
    description: pkg.description,
    version: pkg.version,
    schemas: [survey_01],
  });
});
