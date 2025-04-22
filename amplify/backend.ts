import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

const backend = defineBackend({
  auth
});

backend.addOutput({
  custom: {
    api_name:   "allergenApi",
    api_region: "eu‑west‑1",
    api_url:    "https://kw5rskam11.execute-api.eu-west-1.amazonaws.com/dev"
  }
});