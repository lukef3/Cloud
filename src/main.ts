import "./assets/main.css";
import { createApp } from "vue";
import App from "./App.vue";
import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import { fetchAuthSession } from "@aws-amplify/auth";
import outputs from "../amplify_outputs.json";

const amplifyConfig = parseAmplifyConfig(outputs);

const resources = {
    ...amplifyConfig,
    API: {
        REST: {
            [outputs.custom.api_name]: {
                endpoint: outputs.custom.api_url,
                region:   outputs.custom.api_region
            }
        }
    }
};

const options = {
    API: {
        REST: {
            headers: async () => {
                const session = await fetchAuthSession();
                return {
                    Authorization: session.tokens?.idToken?.toString() ?? ""
                };
            }
        }
    }
};

Amplify.configure(resources, options);

createApp(App).mount("#app");
