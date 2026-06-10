import { loadLocalEnv } from "../load-env";
import { ensureSystemCareers } from "../services/system-careers.service";

loadLocalEnv();

ensureSystemCareers()
  .then(() => {
    console.log("Career Center seed jobs ensured.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
