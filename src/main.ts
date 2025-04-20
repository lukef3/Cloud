import "./assets/main.css";
import { createApp } from "vue";
import App from "./App.vue";
import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import outputs from "../amplify_outputs.json";

const amplifyConfig = parseAmplifyConfig(outputs);

Amplify.configure(outputs);

createApp(App).mount("#app");
